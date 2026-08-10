import fs from 'node:fs';
import {normalizeOutcome} from './status-normalize.mjs';
const R=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const regs=R('data/regulations.json').records;
const queue = [];
for(const r of regs){
  // Determine canonical outcome
  const outcome = normalizeOutcome(r.verification?.legalReview?.status || r.verification?.content?.status || r.substantiveVerificationStatus || r.researchStatus);
  if(outcome==='deep-manual-review'){
    // require legal review
    queue.push({municipalityCode:r.municipalityCode,regulationId:r.id,reason:'canonical outcome requires legal review',legalReviewStatus:r.verification?.legalReview?.status||null});
  }
}
const out={generatedAt:new Date().toISOString(),count:queue.length,items:queue};
try{fs.mkdirSync('reports/automation',{recursive:true})}catch{}
fs.writeFileSync('reports/automation/legal-review-queue.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({message:'legal queue built',count:queue.length},null,2));
