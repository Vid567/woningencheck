import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {normalizeOutcome, normalizeRoute} from './status-normalize.mjs';

const R=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const W=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');

const municipalities=R('data/municipalities-2026.json').municipalities.map(m=>m.code);
const research=R('data/research-status.json').records;
let regs = R('data/regulations.json').records;
const batchFiles=fs.readdirSync('data/research-batches').filter(n=>n.endsWith('.json')).map(n=>({name:n,content:R('data/research-batches/'+n)}));

// If the current branch's regulations appear incomplete, attempt to merge persisted regulations from origin/main
try{
  const MIN_EXPECTED_REGS = 200; // heuristic: nationwide should have many persisted regs
  if(!Array.isArray(regs) || regs.length < MIN_EXPECTED_REGS){
    try{
      // fetch main (shallow) and read the file from origin/main
      execSync('git fetch origin main --depth=1', {stdio:['ignore','ignore','ignore']});
      const mainRaw = execSync('git show origin/main:data/regulations.json', {encoding:'utf8'});
      const mainRegs = JSON.parse(mainRaw).records || [];
      // merge by id: prefer branch regs, but include records from main not present in branch
      const byId = new Map();
      for(const r of mainRegs) if(r && r.id) byId.set(r.id,r);
      for(const r of regs) if(r && r.id) byId.set(r.id,r);
      regs = Array.from(byId.values());
      console.log(`Merged regulations: branch had ${regs.length}, main provided ${mainRegs.length}`);
    }catch(err){
      console.warn('Could not fetch/merge origin/main regulations:',err.message);
    }
  }
}catch(e){console.warn('Regulations merge check failed:',e.message)}

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
for(const code of municipalities)accounted[code]={state:null,details:{}};

// Build regs by municipality for outcome mapping
const regsByMunicipality = new Map();
for(const r of regs){
  if(!r || !r.municipalityCode) continue;
  if(!regsByMunicipality.has(r.municipalityCode)) regsByMunicipality.set(r.municipalityCode,[]);
  regsByMunicipality.get(r.municipalityCode).push(r);
}

// diagnostic counts for debugging why persisted regs are undercounted
const regsTotal = regs.length;
const regsUniqueMunicipalities = Array.from(new Set(regs.map(r=>r && r.municipalityCode).filter(Boolean))).length;
const regsWithEvidenceMunicipalities = Array.from(new Set(regs.filter(r=>r && Array.isArray(r.evidence) && r.evidence.length>0 && r.municipalityCode).map(r=>r.municipalityCode))).length;
const regsWithVerificationMunicipalities = Array.from(new Set(regs.filter(r=>r && r.verification && r.municipalityCode).map(r=>r.municipalityCode))).length;
const regsSampleMunicipalities = Array.from(new Set(regs.map(r=>r && r.municipalityCode).filter(Boolean))).slice(0,20);

// assign states and municipality-level canonical outcomes
function municipalityOutcomeFromRegs(records){
  // scoring: deep-manual-review (3) > targeted-review (2) > structured-complete (1)
  const score = { 'deep-manual-review':3, 'targeted-review':2, 'structured-complete':1 };
  let best = null, bestScore=0;
  for(const r of records){
    const outcome = normalizeOutcome(r.verification?.legalReview?.status || r.verification?.content?.status || r.verification?.currentness?.status || r.substantiveVerificationStatus || r.substantiveOutcome || null);
    if(!outcome) continue;
    const s = score[outcome]||0;
    if(s>bestScore){ bestScore=s; best=outcome; }
  }
  return best;
}

for(const code of municipalities){
  const hasPersist = hasPersistedVerification(code);
  const inRegs = regsByMunicipality.has(code);
  const hist = historicalProcessed(code);
  const rs = research.find(r=>r.municipalityCode===code);

  if(hasPersist){
    // persisted evidence: auto-verified (includes historical findings that are persisted)
    accounted[code].state='auto-verification-persisted';
    if(inRegs) accounted[code].details.outcome = municipalityOutcomeFromRegs(regsByMunicipality.get(code));
  } else if(hist){
    // historicalProcessed() returns true only if findings link to regs, so should be treated as persisted
    accounted[code].state='historical-deep-research-complete';
    if(inRegs) accounted[code].details.outcome = municipalityOutcomeFromRegs(regsByMunicipality.get(code));
  } else {
    if(!rs) accounted[code].state='not-yet-processed';
    else if(rs.discoveryStatus==='research-only' || (rs.researchCompletedAt && (!rs.researchedPermitTypes || rs.researchedPermitTypes.length===0))) accounted[code].state='discovery-only';
    else if(rs.researchStatus && ['verified','partially-verified','legal-review-required','source-review'].includes(rs.researchStatus)){
      // research claims progress but no persisted evidence: inconsistent
      accounted[code].state='inconsistent-record';
    } else {
      accounted[code].state='review-required';
    }
  }
}

// detect duplicates (in research list) and inconsistencies
const researchCodes = research.map(r=>r.municipalityCode);
const duplicateCodes = researchCodes.filter((v,i,a)=>a.indexOf(v)!==i);
const missing = Object.entries(accounted).filter(([k,v])=>!['auto-verification-persisted','historical-deep-research-complete'].includes(v.state)).map(([k])=>k);
const inconsistent = Object.entries(accounted).filter(([k,v])=>v.state==='inconsistent-record').map(([k])=>k);

// produce totals by state
const totals={};
for(const [code,info] of Object.entries(accounted)){
  totals[info.state]=(totals[info.state]||0)+1;
}

// municipality-level outcome counts (only consider municipalities with persisted evidence)
const municipalityOutcomeTotals = { 'structured-complete':0,'targeted-review':0,'deep-manual-review':0 };
for(const code of municipalities){
  const info = accounted[code];
  if(['auto-verification-persisted','historical-deep-research-complete'].includes(info.state)){
    const outcome = info.details.outcome || null;
    if(outcome && municipalityOutcomeTotals.hasOwnProperty(outcome)) municipalityOutcomeTotals[outcome]++;
  }
}

// regulation-row level counts (separate metric)
const regulationRowCounts = {
  structuredCompleteRows: regs.filter(r=>normalizeOutcome(r.verification?.content?.status||r.verification?.currentness?.status||r.substantiveVerificationStatus)==='structured-complete').length,
  targetedReviewRows: regs.filter(r=>normalizeOutcome(r.verification?.content?.status||r.verification?.currentness?.status||r.substantiveVerificationStatus)==='targeted-review').length,
  deepManualRows: regs.filter(r=>normalizeOutcome(r.verification?.legalReview?.status||r.verification?.content?.status||r.substantiveVerificationStatus)==='deep-manual-review').length
};

const completedAccountedTotal = Object.values(accounted).filter(x=>['auto-verification-persisted','historical-deep-research-complete'].includes(x.state)).length;
const report={
  path:'reports/automation/municipality-accounting.json',
  canonicalTotal:municipalities.length,
  completedAccountedTotal,
  remainingCount:municipalities.length - completedAccountedTotal,
  missingCodes:missing,
  duplicateCodes:Array.from(new Set(duplicateCodes)),
  inconsistentCodes:inconsistent,
  historicalProcessedCount:Object.values(accounted).filter(x=>x.state==='historical-deep-research-complete').length,
  autoProcessedCount:Object.values(accounted).filter(x=>x.state==='auto-verification-persisted').length,
  municipalityOutcomeTotals,
  regulationRowCounts,
  regsDiagnostics: {
    regsTotal,
    regsUniqueMunicipalities,
    regsWithEvidenceMunicipalities,
    regsWithVerificationMunicipalities,
    regsSampleMunicipalities
  },
  stateTotals:totals,
  details:accounted
};

// ensure output directory
try{fs.mkdirSync('reports/automation',{recursive:true})}catch{}
W(report.path,report);
console.log(JSON.stringify({message:'Accounting written',path:report.path,summary:{canonicalTotal:report.canonicalTotal,accountedTotal:report.accountedTotal,autoProcessed:report.autoProcessedCount,historicalProcessed:report.historicalProcessedCount}},null,2));
