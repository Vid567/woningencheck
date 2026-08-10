import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)+'\n');
const batchSize=Math.max(1,Math.min(50,Number(process.env.BATCH_SIZE||25)));
const batchLabel=process.env.BATCH_LABEL||`auto-${new Date().toISOString().slice(0,10)}`;
const municipalities=(await read('data/municipalities-2026.json')).municipalities;
const registry=await read('data/source-registry/bronregister-342.json');
const status=await read('data/research-status.json');
const processed=new Set();
for(const path of ['data/research-batches/batch-001.json','data/research-batches/batch-002.json','data/research-batches/batch-003.json','data/research-batches/batch-004-hybrid.json','data/research-batches/batch-005-registry-discovery.json']){
 try{const x=await read(path);for(const r of (x.municipalities||x.records||[]))processed.add(r.municipalityCode);}catch{}
}
const statusByCode=new Map((status.records||[]).map(r=>[r.municipalityCode,r]));
const regByCode=new Map((registry.records||[]).map(r=>[r.municipalityCode,r]));
const queue=municipalities.filter(m=>!processed.has(m.code) && (statusByCode.get(m.code)?.researchStatus||statusByCode.get(m.code)?.status||'not-started')==='not-started').slice(0,batchSize);
if(!queue.length) throw new Error('No unprocessed not-started municipalities remain');
const UA='WoningencheckResearchBot/2.0 (+https://woningencheck.nl)';
const keywords=['huisvest','verhuur','kamerverhuur','opkoop','splits','onttrekk','leegstand','vakantieverhuur','short-stay','shortstay','woonruimte','woningdelen','woningvorming'];
const noise=[/zaalverhuur/i,/onderwijshuisvesting/i,/grondwater/i,/weiland/i,/subsidie/i,/ouderenhuisvesting/i,/statushouder/i];
let requests=0,errors=0,active=0,maxConcurrency=0;
const fetchText=async url=>{requests++;active++;maxConcurrency=Math.max(maxConcurrency,active);try{const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':UA}});return{ok:r.ok,status:r.status,url:r.url,text:await r.text()}}catch(e){errors++;return{ok:false,status:'error',url,text:'',error:String(e)}}finally{active--}};
const locs=xml=>[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m=>m[1].replaceAll('&amp;','&'));
const links=(html,base)=>{const out=[];for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){try{out.push(new URL(m[1],base).href)}catch{}}return[...new Set(out)]};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
const relevant=u=>{const t=decodeURIComponent(u).toLowerCase();return keywords.some(k=>t.includes(k))&&!noise.some(r=>r.test(t))};
async function discover(base){const cand=new Set();const add=xs=>xs.forEach(u=>{if(host(u)===host(base)&&relevant(u))cand.add(u)});const home=await fetchText(base);if(home.ok)add(links(home.text,home.url));const sm=[];const robots=await fetchText(new URL('/robots.txt',base).href);if(robots.ok)for(const m of robots.text.matchAll(/^sitemap:\s*(\S+)/gim))sm.push(m[1]);sm.push(new URL('/sitemap.xml',base).href,new URL('/sitemap_index.xml',base).href);for(const s of [...new Set(sm)].slice(0,3)){const r=await fetchText(s);if(!r.ok)continue;const ls=locs(r.text);add(ls);for(const child of ls.filter(x=>/sitemap/i.test(x)).slice(0,3)){const c=await fetchText(child);if(c.ok)add(locs(c.text));}}const list=[...cand].slice(0,12),live=[];for(const u of list.slice(0,6)){const r=await fetchText(u);live.push({url:u,status:r.status,reachable:r.ok,finalUrl:r.url})}return{candidates:list,reachable:live.filter(x=>x.reachable).map(x=>x.finalUrl||x.url)}}
const records=[];let idx=0;
await Promise.all(Array.from({length:5},async()=>{while(true){const i=idx++;if(i>=queue.length)return;const m=queue[i],rr=regByCode.get(m.code),site=(rr?.sources||[]).find(s=>s.sourceClass==='municipal-site')?.url||null;const t=performance.now();if(!rr||!site){records[i]={municipalityCode:m.code,municipalityName:m.name,province:m.provinceName||m.province,registryHit:Boolean(rr),municipalSite:site,candidateCount:0,reachableCount:0,route:'manual-review-required',reason:!rr?'no-registry-record':'no-municipal-site',durationMs:Math.round(performance.now()-t)};continue}const d=await discover(site);records[i]={municipalityCode:m.code,municipalityName:m.name,province:m.provinceName||m.province,registryHit:true,municipalSite:site,candidateCount:d.candidates.length,reachableCount:d.reachable.length,candidates:d.candidates,reachableCandidates:d.reachable,route:d.reachable.length?'structured-verification':'deep-verification-needed',durationMs:Math.round(performance.now()-t)}}}));
const summary={municipalities:records.length,registryHits:records.filter(r=>r.registryHit).length,structuredVerification:records.filter(r=>r.route==='structured-verification').length,deepVerificationNeeded:records.filter(r=>r.route==='deep-verification-needed').length,manualReviewRequired:records.filter(r=>r.route==='manual-review-required').length,totalCandidates:records.reduce((n,r)=>n+r.candidateCount,0),networkRequests:requests,networkErrors:errors,maxConcurrency};
const safeLabel=batchLabel.replace(/[^a-z0-9._-]+/gi,'-').toLowerCase();
await fs.mkdir('data/research-batches/auto',{recursive:true});await fs.mkdir('docs/research-batches/auto',{recursive:true});
const output={schemaVersion:'1.0.0',batchId:safeLabel,generatedAt:new Date().toISOString(),selection:{batchSize,untouchedOnly:true},records,summary,safety:{discoveryIsNotLegalVerification:true,publicRulesCreated:0,negativeLegalConclusions:0}};
await write(`data/research-batches/auto/${safeLabel}.json`,output);
const rows=records.map(r=>`| ${r.municipalityName} | ${r.registryHit?'ja':'nee'} | ${r.candidateCount} | ${r.reachableCount} | ${r.route} |`).join('\n');
await fs.writeFile(`docs/research-batches/auto/${safeLabel}.md`,`# ${safeLabel}\n\nAutomatische registry-backed discovery voor de volgende nog niet onderzochte gemeenten. Discovery is geen juridische verificatie.\n\n| Gemeente | Registry-hit | Kandidaten | Live | Route |\n| --- | --- | ---: | ---: | --- |\n${rows}\n\n## Samenvatting\n\n- Gemeenten: ${summary.municipalities}\n- Registry-hits: ${summary.registryHits}\n- Structurele verificatie: ${summary.structuredVerification}\n- Diepe verificatie: ${summary.deepVerificationNeeded}\n- Handmatige review: ${summary.manualReviewRequired}\n- Kandidaten: ${summary.totalCandidates}\n- Netwerkrequests: ${summary.networkRequests}\n- Netwerkerrors: ${summary.networkErrors}\n- Publieke regels: 0\n`);
console.log(JSON.stringify({batchId:safeLabel,...summary},null,2));
if(summary.registryHits!==records.length) process.exitCode=1;
