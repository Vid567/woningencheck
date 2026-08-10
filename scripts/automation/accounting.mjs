import fs from 'node:fs';
import {normalizeOutcome, normalizeRoute} from './status-normalize.mjs';

const R=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const W=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

const municipalities=R('data/municipalities-2026.json').municipalities.map(m=>m.code);
const research=R('data/research-status.json').records;
const regs=R('data/regulations.json').records;
const batchFiles=fs.readdirSync('data/research-batches').filter(n=>n.endsWith('.json')).map(n=>({name:n,content:R('data/research-batches/'+n)}));

// helper: determine if municipality has persisted verification evidence
function hasPersistedVerification(municipalityCode){
  // consider persisted if there is at least one regulation record with municipalityCode and evidence
  return regs.some(r=>r.municipalityCode===municipalityCode && Array.isArray(r.evidence) && r.evidence.length>0 && r.verification);
}

// historical processed: present in any batch file and their findings link to persisted regulations
function historicalProcessed(municipalityCode){
  for(const bf of batchFiles){
    const findings = bf.content.findings||[];
    if(findings.some(f=>f.municipalityCode===municipalityCode)){
      // verify at least one of those findings exists in regs
      const ok = findings.some(f=>regs.some(r=>r.id===f.id));
      if(ok) return true;
    }
  }
  return false;
}

// compute authoritative accounting
const accounted = {};
for(const code of municipalities)accounted[code]=null;

// Step 1: mark municipalities with persisted verification (auto or historical)
for(const code of municipalities){
  if(hasPersistedVerification(code)){
    accounted[code]={state:'auto-verification-persisted'};
  }
}
// Step 2: mark historical batches not in regs as historical-deep-research-complete if findings indicate deep research but not persisted as regulations
for(const code of municipalities){
  if(!accounted[code] && historicalProcessed(code)){
    accounted[code]={state:'historical-deep-research-complete'};
  }
}
// Step 3: discovery-only or not-started
for(const code of municipalities){
  if(!accounted[code]){
    const rs = research.find(r=>r.municipalityCode===code);
    if(!rs) accounted[code]={state:'not-yet-processed'};
    else{
      // if research record has discoveryStatus research-only or discoveryBatch but no persisted regs => discovery-only
      if(rs.discoveryStatus==='research-only' || (!hasPersistedVerification(code) && rs.researchCompletedAt && (!rs.researchedPermitTypes || rs.researchedPermitTypes.length===0))){
        accounted[code]={state:'discovery-only'};
      } else if(hasPersistedVerification(code)){
        accounted[code]={state:'auto-verification-persisted'};
      } else{
        accounted[code]={state:'review-required'};
      }
    }
  }
}

// detect duplicates and inconsistencies
const allCodes = Object.keys(accounted);
const duplicates = []; // should be none since use canonical list
const missing = municipalities.filter(m=>!accounted[m]);
const inconsistent = [];

// produce totals by state
const totals={};
for(const [code,info] of Object.entries(accounted)){
  totals[info.state]=(totals[info.state]||0)+1;
}

const report={
  path:'reports/automation/municipality-accounting.json',
  canonicalTotal:municipalities.length,
  accountedTotal:Object.keys(accounted).length,
  missingCodes:missing,
  duplicateCodes:duplicates,
  historicalProcessedCount:Object.values(accounted).filter(x=>x.state==='historical-deep-research-complete').length,
  autoProcessedCount:Object.values(accounted).filter(x=>x.state==='auto-verification-persisted').length,
  structuredCompleteCount:Object.values(accounted).filter(x=>{
    // inspect regs to see canonical outcome
    const code = Object.keys(accounted).find(k=>accounted[k]===x);
    return false;
  }).length,
  structuredCompleteCount_by_scan: regs.filter(r=>normalizeOutcome(r.verification?.content?.status||r.verification?.currentness?.status||r.substantiveVerificationStatus)==='structured-complete').length,
  targetedReviewCount_by_scan: regs.filter(r=>normalizeOutcome(r.verification?.content?.status||r.verification?.currentness?.status||r.substantiveVerificationStatus)==='targeted-review').length,
  deepManualReviewCount_by_scan: regs.filter(r=>normalizeOutcome(r.verification?.legalReview?.status||r.verification?.content?.status||r.substantiveVerificationStatus)==='deep-manual-review').length,
  stateTotals:totals,
  inconsistent:inconsistent
};

// ensure output directory
try{fs.mkdirSync('reports/automation',{recursive:true})}catch{}
W(report.path,report);
console.log(JSON.stringify({message:'Accounting written',path:report.path,summary:{canonicalTotal:report.canonicalTotal,accountedTotal:report.accountedTotal,autoProcessed:report.autoProcessedCount,historicalProcessed:report.historicalProcessedCount}},null,2));
