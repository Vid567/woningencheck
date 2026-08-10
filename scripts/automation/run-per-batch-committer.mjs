import fs from 'node:fs';
import {execSync} from 'node:child_process';
const R=p=>JSON.parse(fs.readFileSync(p,'utf8'));

// This script demonstrates per-batch commit semantics.
// It iterates over files in data/research-batches/*.json and for each batch does:
//  - run a per-batch QA check if test script exists (test-batch-<id>.mjs)
//  - if QA passes, invoke scripts/automation/commit-batch.mjs to commit that batch file and related changes
//  - if QA fails, stop and report

const batches = fs.readdirSync('data/research-batches').filter(f=>f.endsWith('.json'));
console.log('Found batches:',batches);
for(const batchFile of batches){
  const batch = R(`data/research-batches/${batchFile}`);
  const batchId = batch.batchId||batchFile.replace('.json','');
  console.log('\nProcessing',batchFile,'id',batchId);
  // run QA: look for test script test-batch-<id>.mjs
  const scriptName = `scripts/test-batch-${batchId.split(/[-:]/)[1]||batchId}.mjs`;
  let qaPass=true;
  if(fs.existsSync(scriptName)){
    try{
      console.log('Running QA script',scriptName);
      execSync(`node ${scriptName}`,{stdio:'inherit'});
      console.log('QA passed for',batchId);
    }catch(e){
      console.error('QA failed for',batchId,':',e.message);
      qaPass=false;
    }
  } else {
    console.log('No QA script present for',batchId,'— assuming validated');
  }
  if(!qaPass) { console.error('Stopping per-batch commit run due to QA failure'); process.exit(1); }

  // commit batch file and any files that mention this batch
  const pathsToCommit = [
    `data/research-batches/${batchFile}`,
    'data/research-status.json',
    'data/regulations.json',
    'data/sources.json'
  ];
  // call commit-batch script
  const simulate = process.env.SIMULATE||'true';
  const cmd = `node scripts/automation/commit-batch.mjs --paths="${pathsToCommit.join(',')}" --message="Persist ${batchId} (per-batch)" --simulate=${simulate}`;
  console.log('Invoking commit:',cmd);
  try{
    execSync(cmd,{stdio:'inherit'});
  }catch(e){
    console.error('Commit command failed',e.message);
    process.exit(1);
  }
}
console.log('\nPer-batch commit run complete');
