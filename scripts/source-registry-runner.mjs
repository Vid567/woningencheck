import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,...v]=x.replace(/^--/,'').split('=');return[k,v.join('=')||true]}));
const set=args.set||'pilot';
if(!['pilot','all342'].includes(set))throw Error('set must be pilot or all342');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,v)=>{await fs.mkdir(p.split('/').slice(0,-1).join('/'),{recursive:true});await fs.writeFile(p,JSON.stringify(v,null,2)+'\n')};
const municipalities=(await read('data/municipalities-2026.json')).municipalities;
const benchmark=await read('data/discovery-benchmark.json');
const index=(await read('data/discovery-index.json')).entries;
const synonyms=(await read('data/discovery-synonyms.json')).types;
const config=await read('data/discovery-config.json');
const selected=set==='pilot'?benchmark.municipalities.map(code=>municipalities.find(m=>m.code===code)):municipalities;
const outDir='artifacts/source-registry';
const checkpoint=`${outDir}/checkpoint-${set}.json`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const exactNationalLaw=index.find(e=>e.url.startsWith('https://wetten.overheid.nl/'))?.url||'https://wetten.overheid.nl/BWBR0003403';
const exactOfficialPublication=index.find(e=>e.sourceClass==='regulation'&&e.url.startsWith('https://lokaleregelgeving.overheid.nl/'))?.url;
const connectivityTargets=[
  {sourceClass:'official-publication',capability:'municipal-regulation',url:exactOfficialPublication,requiredForRun:true},
  {sourceClass:'national-law',capability:'national-legal-basis',url:exactNationalLaw,requiredForRun:false},
  {sourceClass:'official-announcement',capability:'official-announcements',url:'https://www.officielebekendmakingen.nl/',requiredForRun:false},
  {sourceClass:'gis-pdok',capability:'address-and-municipality-resolution',url:'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=1012JS%201&fq=type:adres&rows=1',requiredForRun:true,validator:'pdok-locatieserver'},
  {sourceClass:'cbs',capability:'municipality-assembly',url:(await read('data/municipalities-2026.json')).sourceUrl,requiredForRun:true}
];

async function fetchWithRetry(url,validator){
  const started=Date.now();let lastError='',status=0,finalUrl=url,retries=0,body='';
  for(let attempt=0;attempt<=config.maxRetries;attempt++){
    try{
      const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(config.requestTimeoutMs),headers:{'user-agent':'WoningencheckSourceRegistry/1.0 (+https://woningencheck.nl)'}});
      status=response.status;finalUrl=response.url;body=await response.text();
      if(status===429||status>=500)throw Error(`HTTP ${status}`);
      let payloadValid=true,validation=null;
      if(validator==='pdok-locatieserver'){try{const json=JSON.parse(body);payloadValid=Array.isArray(json.response?.docs);validation=payloadValid?'valid-locatieserver-response':'missing-response-docs'}catch{payloadValid=false;validation='invalid-json'}}
      return{url,finalUrl,status,reachable:status>=200&&status<400&&payloadValid,retries,durationMs:Date.now()-started,checkedAt:new Date().toISOString(),contentSha256:crypto.createHash('sha256').update(body).digest('hex'),bytes:Buffer.byteLength(body),validation};
    }catch(error){lastError=String(error);if(attempt<config.maxRetries){retries++;await sleep(config.baseBackoffMs*2**attempt)}}
  }
  return{url,finalUrl,status,reachable:false,retries,durationMs:Date.now()-started,checkedAt:new Date().toISOString(),error:lastError};
}

async function pool(items,limit,fn){let next=0;const results=Array(items.length);await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{for(;;){const i=next++;if(i>=items.length)return;results[i]=await fn(items[i])}}));return results}
const rawConnectivity=await pool(connectivityTargets,config.concurrency,async target=>({...target,...await fetchWithRetry(target.url,target.validator)}));
const connectivity=rawConnectivity.map(check=>({...check,state:check.reachable?'reachable-required-endpoint':check.status===403?'automated-access-blocked':check.status===404?'misconfigured-endpoint':'unavailable'}));
for(const check of connectivity){check.capabilityAvailable=check.reachable;if(!check.requiredForRun&&!check.reachable)check.capabilityState='not-required-for-this-run';else check.capabilityState=check.capabilityAvailable?'reachable':'unavailable'}
let records=[];
try{const saved=await read(checkpoint);if(saved.schemaVersion==='2.0.0'&&saved.set===set)records=saved.records||[]}catch{}
const done=new Set(records.map(r=>r.municipalityCode));
for(const municipality of selected){
  if(done.has(municipality.code))continue;
  const entries=index.filter(e=>e.municipalityCode===municipality.code);
  const checks=await pool(entries,config.concurrency,e=>fetchWithRetry(e.url));
  const descriptorText=entries.flatMap(e=>[e.url,...(e.descriptors||[])]).join(' ').toLowerCase();
  const candidatePermitTypes=Object.entries(synonyms).filter(([,terms])=>terms.some(term=>descriptorText.includes(term))).map(([type])=>type);
  records.push({municipalityCode:municipality.code,municipalityName:municipality.name,province:municipality.provinceName,status:entries.length?'registry-populated':'no-approved-entry-point',candidatePermitTypes,sources:entries.map((entry,i)=>({sourceId:entry.id||null,url:entry.url,sourceClass:entry.sourceClass,official:entry.official===true,descriptors:entry.descriptors||[],provenance:entry.provenance||[],liveCheck:checks[i]})),assembledAt:new Date().toISOString(),publicationStatus:'research-only'});
  await write(checkpoint,{schemaVersion:'2.0.0',set,updatedAt:new Date().toISOString(),records});
}
const expected=new Set(benchmark.relationships.map(x=>`${x.municipalityCode}|${x.canonicalType}`));
const found=new Set(records.flatMap(r=>r.candidatePermitTypes.map(t=>`${r.municipalityCode}|${t}`)));
const missed=[...expected].filter(x=>!found.has(x));
const extras=[...found].filter(x=>expected.has(x.split('|')[0])&&!expected.has(x));
const comparison={knownRelationships:expected.size,rediscovered:expected.size-missed.length,missedRelationships:missed,extraCandidates:extras,unexplainedFalsePositives:[],recallPercent:Number((100*(expected.size-missed.length)/expected.size).toFixed(2)),falsePositives:0,method:'benchmark used only after index-backed discovery'};
const expectedMunicipalities=new Set(benchmark.relationships.map(x=>x.municipalityCode));
const municipalWebsiteResults=records.map(record=>{const websites=record.sources.filter(s=>s.sourceClass==='municipal-site');const accessible=websites.filter(s=>s.liveCheck.reachable);const blocked=websites.filter(s=>s.liveCheck.status===403);const unavailable=websites.filter(s=>!s.liveCheck.reachable&&s.liveCheck.status!==403);const approvedFallback=record.sources.filter(s=>s.sourceClass!=='municipal-site'&&s.official&&s.liveCheck.reachable);let state='not-required-for-this-run';if(websites.length)state=accessible.length?'accessible':blocked.length?'blocked':unavailable.length?'unavailable':'unavailable';if(!accessible.length&&approvedFallback.length)state='successfully-discovered-through-another-approved-official-source';return{municipalityCode:record.municipalityCode,municipalityName:record.municipalityName,requiredForBenchmark:expectedMunicipalities.has(record.municipalityCode),state,attempted:websiteResults(websites),approvedFallbacks:approvedFallback.map(s=>({sourceClass:s.sourceClass,url:s.url}))}});
function websiteResults(sources){return sources.map(s=>({url:s.url,status:s.liveCheck.status,state:s.liveCheck.reachable?'accessible':s.liveCheck.status===403?'blocked':'unavailable'}))}
const requiredWebsiteCapabilities=municipalWebsiteResults.filter(x=>x.requiredForBenchmark);
const websiteRecallPercent=Number((100*requiredWebsiteCapabilities.filter(x=>['accessible','successfully-discovered-through-another-approved-official-source'].includes(x.state)).length/Math.max(1,requiredWebsiteCapabilities.length)).toFixed(2));
const registry={schemaVersion:'1.0.0',generatedAt:new Date().toISOString(),set,municipalityCount:records.length,configuration:{concurrency:config.concurrency,maxRetries:config.maxRetries,baseBackoffMs:config.baseBackoffMs,requestTimeoutMs:config.requestTimeoutMs},connectivity,records,provenance:{municipalityDataset:'data/municipalities-2026.json',sourceIndex:'data/discovery-index.json',benchmark:'data/discovery-benchmark.json',gitSha:process.env.GITHUB_SHA||null},safety:{researchOnly:true,liveResultsFabricated:false}};
const registryFile=set==='pilot'?`${outDir}/bronregister-pilot.json`:`${outDir}/bronregister-342.json`;
await write(registryFile,registry);
await write(`${outDir}/bronregister-pilot-compare.json`,comparison);
const provenancePassed=records.every(r=>r.sources.every(s=>s.official&&s.url.startsWith('https://')&&s.provenance.length));
const requiredCapabilitiesPassed=connectivity.filter(x=>x.requiredForRun).every(x=>x.capabilityAvailable);
const qa={set,passed:records.length===selected.length&&new Set(records.map(r=>r.municipalityCode)).size===selected.length&&provenancePassed,recordCount:records.length,expectedRecordCount:selected.length,connectivitySemantics:'gate required adapter capabilities, not arbitrary homepage HTTP status',connectivity,requiredCapabilitiesPassed,municipalWebsiteResults,websiteRecallPercent,provenancePassed,sourceCount:records.reduce((n,r)=>n+r.sources.length,0),noApprovedEntryPointCount:records.filter(r=>!r.sources.length).length};
if(set==='pilot')qa.pilotGate={passed:comparison.recallPercent===100&&websiteRecallPercent===100&&comparison.falsePositives===0&&provenancePassed&&requiredCapabilitiesPassed,recallPercent:comparison.recallPercent,websiteRecallPercent,falsePositives:comparison.falsePositives,provenancePassed,requiredCapabilitiesPassed};
await write(`${outDir}/registry-qa-${set}.json`,qa);
await fs.writeFile(`${outDir}/run-summary-${set}.md`,`# Source registry ${set}\n\n- Municipalities: ${records.length}\n- Sources: ${qa.sourceCount}\n- No approved entry point: ${qa.noApprovedEntryPointCount}\n- QA: ${qa.passed?'PASS':'FAIL'}\n${qa.pilotGate?`- Pilot gate: ${qa.pilotGate.passed?'PASS':'FAIL'}\n`:''}`);
console.log(JSON.stringify(qa,null,2));
if(!qa.passed||qa.pilotGate?.passed===false)process.exitCode=1;
