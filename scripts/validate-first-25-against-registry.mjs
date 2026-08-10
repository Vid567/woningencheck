import fs from 'node:fs/promises';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const batches=[await read('data/research-batches/batch-001.json'),await read('data/research-batches/batch-002.json'),await read('data/research-batches/batch-003.json')];
const registry=await read('data/source-registry/bronregister-342.json');
const municipalities=batches.flatMap(b=>b.municipalities||[]);
if(municipalities.length!==25) throw new Error(`Expected 25 researched municipalities, got ${municipalities.length}`);
const findings=batches.flatMap(b=>(b.findings||[]).map(f=>({...f,batchId:b.batchId})));
const norm=u=>{try{const x=new URL(u);return `${x.hostname.replace(/^www\./,'').toLowerCase()}${x.pathname.replace(/\/$/,'')}`;}catch{return String(u||'')}};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}};
const registryByCode=new Map((registry.records||[]).map(r=>[r.municipalityCode,r]));
const knownUrls=f=>[f.officialRegulationUrl,f.officialInfoUrl,f.officialApplicationUrl,...(f.evidence||[]).map(e=>e.url),...(f.sources||[]).map(s=>s.url)].filter(Boolean);
let requests=0,errors=0;
async function check(url){requests++;try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'WoningencheckValidationBot/1.0 (+https://woningencheck.nl)'}});return {url,status:r.status,ok:r.ok,finalUrl:r.url};}catch(e){errors++;return{url,status:'error',ok:false,error:String(e)}}}
const records=[];
for(const m of municipalities){
  const rr=registryByCode.get(m.municipalityCode);
  const mf=findings.filter(f=>f.municipalityCode===m.municipalityCode);
  const regSources=(rr?.sources||[]).map(s=>s.url).filter(Boolean);
  const regHosts=new Set(regSources.map(host));
  const known=[...new Set(mf.flatMap(knownUrls))];
  const sourceRelationships=known.map(url=>({url,exactRegistryMatch:regSources.some(x=>norm(x)===norm(url)),domainCovered:regHosts.has(host(url))}));
  const live=[];
  for(const url of known.slice(0,8)) live.push(await check(url));
  records.push({municipalityCode:m.municipalityCode,municipalityName:m.municipalityName,batchIds:[...new Set(mf.map(f=>f.batchId))],reviewLevel:m.reviewLevel||null,registryHit:Boolean(rr),registryStatus:rr?.status||null,registrySourceCount:regSources.length,knownFindingCount:mf.length,knownSourceCount:known.length,knownSourceRelationships:sourceRelationships,liveChecks:live,unresolvedQuestions:m.unresolvedQuestions||[]});
}
const summary={municipalities:records.length,registryHits:records.filter(r=>r.registryHit).length,registryPopulated:records.filter(r=>r.registryStatus==='registry-populated').length,knownFindings:findings.length,knownSources:records.reduce((n,r)=>n+r.knownSourceCount,0),domainCoveredKnownSources:records.reduce((n,r)=>n+r.knownSourceRelationships.filter(x=>x.domainCovered).length,0),exactRegistryMatches:records.reduce((n,r)=>n+r.knownSourceRelationships.filter(x=>x.exactRegistryMatch).length,0),liveChecks:records.reduce((n,r)=>n+r.liveChecks.length,0),liveReachable:records.reduce((n,r)=>n+r.liveChecks.filter(x=>x.ok).length,0),networkErrors:errors};
const output={schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),purpose:'Calibration check of the first 25 deeply researched municipalities against the current nationwide registry. This does not replace legal review.',batches:['batch-001','batch-002','batch-003'],summary,records,safety:{publicRulesChanged:false,legalStatusesChanged:false,negativeConclusionsCreated:false}};
await fs.mkdir('reports/validation',{recursive:true});
await fs.writeFile('reports/validation/first-25-registry-validation.json',JSON.stringify(output,null,2)+'\n');
const rows=records.map(r=>`| ${r.municipalityName} | ${r.registryHit?'ja':'nee'} | ${r.registrySourceCount} | ${r.knownFindingCount} | ${r.knownSourceCount} | ${r.liveChecks.filter(x=>x.ok).length}/${r.liveChecks.length} |`).join('\n');
await fs.writeFile('reports/validation/first-25-registry-validation.md',`# Validatie eerste 25 onderzochte gemeenten\n\nDeze controle vergelijkt batches 001–003 met het actuele landelijke bronregister en controleert bekende officiële bronlinks live. Er worden geen juridische conclusies of publieke regels gewijzigd.\n\n| Gemeente | Registry-hit | Registrybronnen | Bekende bevindingen | Bekende bronnen | Live bereikbaar |\n| --- | --- | ---: | ---: | ---: | ---: |\n${rows}\n\n## Samenvatting\n\n- Gemeenten: ${summary.municipalities}\n- Registry-hits: ${summary.registryHits}\n- Registry-populated: ${summary.registryPopulated}\n- Bekende bevindingen: ${summary.knownFindings}\n- Bekende bronlinks: ${summary.knownSources}\n- Bekende brondomeinen gedekt door registry: ${summary.domainCoveredKnownSources}/${summary.knownSources}\n- Exacte registry-URL matches: ${summary.exactRegistryMatches}/${summary.knownSources}\n- Live checks bereikbaar: ${summary.liveReachable}/${summary.liveChecks}\n- Netwerkerrors: ${summary.networkErrors}\n\n## Gebruik\n\nDeze 25 gemeenten functioneren als calibratieset voor de versnelde pipeline. Verschillen worden gebruikt om discovery te verbeteren; bestaande juridische resultaten worden niet automatisch overschreven.\n`);
console.log(JSON.stringify(summary,null,2));
if(summary.registryHits!==25) process.exitCode=1;
