import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {normalizeOutcome} from './status-normalize.mjs';
import nextBatchId from './next-batch-id.mjs';

const W=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
try{fs.mkdirSync('artifacts/selftest',{recursive:true});}catch{}

// Build small canonical municipality list of 12 codes
const canonical = Array.from({length:12},(_,i)=>`GM${String(1000+i).padStart(4,'0')}`);
W('artifacts/selftest/municipalities-12.json',{municipalities:canonical.map((c,i)=>({code:c,name:`Test ${i+1}`,province:'Testprov'}))});

// Create research-status with several historical completed municipalities and discovery-only and missing
const rs = {schemaVersion:'1.0.0',records: canonical.map((code,i)=>({municipalityCode:code,municipalityName:`Test ${i+1}`,province:'Testprov',researchStatus:i<3?'verified':i<6?'partially-verified':i<8?'not-started':'in-research',researchStartedAt:i<6?'2026-01-01':null,researchCompletedAt:i<3?'2026-02-01':(i<6?'2026-03-01':null),lastCheckedAt:'2026-08-01',nextReviewAt:'2027-01-01',researchedPermitTypes:[],unresolvedQuestions:[],conflicts:[],sourceCount: i<3?2:0,notes:''}))};
W('artifacts/selftest/research-status.json',rs);

// Create a couple of historical batch files (batch-001 and batch-002) with findings linking to persisted regulations
const batch1 = {schemaVersion:'1.0.0',batchId:'batch-001',startedAt:'2026-01-01',completedAt:'2026-02-01',batchSize:3,municipalities:canonical.slice(0,3).map(c=>({municipalityCode:c,municipalityName:'Test'})),findings:[{id:'hist-1',municipalityCode:canonical[0]},{id:'hist-2',municipalityCode:canonical[1]}],closure:{closureStatus:'closed'}};
const batch2 = {schemaVersion:'1.0.0',batchId:'batch-002',startedAt:'2026-03-01',completedAt:'2026-04-01',batchSize:2,municipalities:canonical.slice(3,5).map(c=>({municipalityCode:c,municipalityName:'Test'})),findings:[{id:'hist-3',municipalityCode:canonical[3]}],closure:{closureStatus:'closed'}};
W('artifacts/selftest/batch-001.json',batch1);W('artifacts/selftest/batch-002.json',batch2);

// persisted regulations: link to batch findings for some municipalities, and create auto persisted regs for several
const regs = [];
regs.push({id:'hist-1',municipalityCode:canonical[0],evidence:[{url:'https://example.com/1'}],verification:{content:{status:'verified'},legalReview:{status:'required'}}});
regs.push({id:'hist-2',municipalityCode:canonical[1],evidence:[{url:'https://example.com/2'}],verification:{content:{status:'verified'}}});
// auto persisted for next set
for(let i=4;i<8;i++){
  regs.push({id:`auto-${i}`,municipalityCode:canonical[i],evidence:[{url:`https://example.com/auto-${i}`}],verification:{content:{status:i%2===0?'verified':'partially-verified'}}});
}
W('artifacts/selftest/regulations.json',{records:regs});

// Now run the accounting logic (adapted minimal)
function accounting(municipalities,research,regulations,batches){
  const regsByMunicipality = new Map();
  for(const r of regulations.records) { if(!regsByMunicipality.has(r.municipalityCode)) regsByMunicipality.set(r.municipalityCode,[]); regsByMunicipality.get(r.municipalityCode).push(r); }
  const accounted = {};
  for(const code of municipalities){
    if(regsByMunicipality.has(code)){
      accounted[code] = {state:'auto-verification-persisted'};
      continue;
    }
    // historical batch present?
    const inBatch = batches.some(b=>b.findings.some(f=>f.municipalityCode===code));
    if(inBatch) { accounted[code]={state:'historical-deep-research-complete'}; continue; }
    // discovery-only
    const r = research.records.find(x=>x.municipalityCode===code);
    if(!r || (r.researchStatus==='not-started')) accounted[code]={state:'not-yet-processed'}; else accounted[code]={state:'discovery-only'};
  }
  return accounted;
}

const municipalities12 = canonical;
const research12 = JSON.parse(fs.readFileSync('artifacts/selftest/research-status.json','utf8'));
const regs12 = JSON.parse(fs.readFileSync('artifacts/selftest/regulations.json','utf8'));
const batches12 = [batch1,batch2];
const result = accounting(municipalities12,research12,regs12,batches12);
W('artifacts/selftest/municipality-accounting.json',result);

// Selftest assertions
const accountedCount = Object.keys(result).length;
const autoCount = Object.values(result).filter(x=>x.state==='auto-verification-persisted').length;
const historicalCount = Object.values(result).filter(x=>x.state==='historical-deep-research-complete').length;

console.log('SELFTEST SUMMARY');
console.log('municipalities total',municipalities12.length);
console.log('accounted',accountedCount,'auto',autoCount,'historical',historicalCount);

if(accountedCount!==municipalities12.length) { console.error('SELFTEST FAIL: not all accounted'); process.exit(1); }
if(autoCount<1) { console.error('SELFTEST FAIL: auto count zero'); process.exit(1); }
if(historicalCount<1) { console.error('SELFTEST FAIL: historical count zero'); process.exit(1); }
console.log('SELFTEST PASS');
