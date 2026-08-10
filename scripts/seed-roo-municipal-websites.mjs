import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const ROO_URL='https://organisaties.overheid.nl/archive/exportOO_gemeenten.xml';
const municipalities=(JSON.parse(await fs.readFile('data/municipalities-2026.json','utf8'))).municipalities;
const index=JSON.parse(await fs.readFile('data/discovery-index.json','utf8'));
const outDir='artifacts/source-registry';
await fs.mkdir(outDir,{recursive:true});

const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'`]/g,'').replace(/[^a-z0-9]/g,'');
const decode=s=>String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const host=u=>{try{return new URL(u).hostname.toLowerCase()}catch{return''}};
const blockedHosts=new Set(['organisaties.overheid.nl','identifier.overheid.nl','standaarden.overheid.nl','data.overheid.nl','www.overheid.nl','overheid.nl']);
const likelyWebsite=url=>{
  try{
    const u=new URL(url);
    if(!['http:','https:'].includes(u.protocol))return false;
    if(blockedHosts.has(u.hostname.toLowerCase()))return false;
    if(/\.(pdf|xml|csv|zip|jpg|jpeg|png)$/i.test(u.pathname))return false;
    return true;
  }catch{return false}
};

async function fetchText(url){
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'user-agent':'WoningencheckSourceRegistry/1.1 (+https://woningencheck.nl)'}});
  if(!r.ok)throw Error(`ROO fetch failed HTTP ${r.status}`);
  return {text:await r.text(),status:r.status,finalUrl:r.url,contentType:r.headers.get('content-type')||''};
}

const fetched=await fetchText(ROO_URL);
const xml=fetched.text;
const retrievalSha256=crypto.createHash('sha256').update(xml).digest('hex');
const lower=xml.toLowerCase();
const records=[];
const unmatched=[];

function sliceAround(token){
  const p=lower.indexOf(token.toLowerCase());
  if(p<0)return null;
  // Prefer a complete nearby organisation-like XML element. The ROO export format has varied historically,
  // so this deliberately does not hard-code one namespace/tag name.
  const starts=[...lower.slice(Math.max(0,p-12000),p).matchAll(/<([a-z0-9_:-]*(?:organisatie|gemeente)[a-z0-9_:-]*)\b[^>]*>/g)];
  const startMatch=starts.at(-1);
  if(startMatch){
    const start=Math.max(0,p-12000)+startMatch.index;
    const tag=startMatch[1];
    const endTag=`</${tag}>`;
    const e=lower.indexOf(endTag,p);
    if(e>p&&e-start<50000)return xml.slice(start,e+endTag.length);
  }
  return xml.slice(Math.max(0,p-7000),Math.min(xml.length,p+12000));
}

for(const m of municipalities){
  const code=m.code.toLowerCase();
  const tooi=`https://identifier.overheid.nl/tooi/id/gemeente/${code}`;
  let block=sliceAround(code)||sliceAround(tooi);
  if(!block){unmatched.push({municipalityCode:m.code,municipalityName:m.name,reason:'gm-code-not-found-in-roo-export'});continue}
  const urls=[...new Set((block.match(/https?:\/\/[^\s<>"']+/gi)||[]).map(decode).map(x=>x.replace(/[),.;]+$/,'')))];
  const candidates=urls.filter(likelyWebsite);
  // Prefer a candidate whose hostname or nearby XML contains the municipality name.
  const nn=normalize(m.name);
  candidates.sort((a,b)=>{
    const score=u=>{const h=normalize(host(u));return (h.includes(nn)?20:0)+(normalize(block).includes(nn)?2:0)+(u.startsWith('https://')?1:0)};
    return score(b)-score(a);
  });
  const website=candidates[0]||null;
  if(!website){unmatched.push({municipalityCode:m.code,municipalityName:m.name,reason:'no-web-url-in-roo-record',candidateUrls:urls.slice(0,10)});continue}
  records.push({municipalityCode:m.code,municipalityName:m.name,officialWebsite:website,canonicalDomain:host(website),tooiUri:tooi,source:ROO_URL,sourceOwner:'KOOP / Register van Overheidsorganisaties',licence:'CC0-1.0',retrievedAt:new Date().toISOString(),retrievalSha256,status:'authoritative-roo-seed'});
}

// Add only missing municipal-site entry points to the in-workspace discovery index.
const existingKeys=new Set(index.entries.filter(e=>e.sourceClass==='municipal-site').map(e=>`${e.municipalityCode}|${e.domain}`));
let added=0;
for(const r of records){
  const key=`${r.municipalityCode}|${r.canonicalDomain}`;
  if(existingKeys.has(key))continue;
  index.entries.push({municipalityCode:r.municipalityCode,municipalityName:r.municipalityName,authority:r.municipalityName,sourceClass:'municipal-site',domain:r.canonicalDomain,url:r.officialWebsite,official:true,provenance:[`ROO:${r.tooiUri}`,ROO_URL],lastVerified:new Date().toISOString().slice(0,10),discoveryPriority:20,descriptors:['Official municipal website seeded from the Register van Overheidsorganisaties; discovery entry point only, not a legal conclusion.']});
  existingKeys.add(key);added++;
}
index.generatedAt=new Date().toISOString();
await fs.writeFile('data/discovery-index.json',JSON.stringify(index,null,2)+'\n');

const report={schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),source:{url:ROO_URL,status:fetched.status,finalUrl:fetched.finalUrl,contentType:fetched.contentType,sha256:retrievalSha256,owner:'KOOP / Register van Overheidsorganisaties',licence:'CC0-1.0'},canonicalMunicipalities:municipalities.length,rooMatchedWithWebsite:records.length,unmatchedCount:unmatched.length,entriesAddedToWorkspaceIndex:added,records,unmatched};
await fs.writeFile(`${outDir}/roo-municipality-seed.json`,JSON.stringify(report,null,2)+'\n');
await fs.writeFile(`${outDir}/roo-seed-summary.md`,`# ROO municipality website seed\n\n- Canonical municipalities: ${municipalities.length}\n- ROO website seeds: ${records.length}\n- Unmatched: ${unmatched.length}\n- Discovery-index entries added in workspace: ${added}\n- Source: ${ROO_URL}\n- SHA-256: ${retrievalSha256}\n`);
console.log(JSON.stringify({canonicalMunicipalities:municipalities.length,rooMatchedWithWebsite:records.length,unmatchedCount:unmatched.length,entriesAddedToWorkspaceIndex:added,source:ROO_URL},null,2));
if(records.length<300)process.exitCode=1;
