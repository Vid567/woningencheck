import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};
const batch=read('data/research-batches/batch-001.json');
const reviews=read('data/review-queue.json').items;
const params=read('data/dynamic-parameters.json').parameters;
const negative=read('data/negative-source-methodology.json');
const expected=['GM1680','GM0358','GM0197','GM0059','GM0482','GM0613','GM0361','GM0141','GM0034','GM0484'];
if(batch.batchId!=='batch-001'||batch.municipalities.length!==10)fail('Batch 001 must contain exactly ten municipalities');
if(JSON.stringify(batch.municipalities.map(x=>x.municipalityCode))!==JSON.stringify(expected))fail('Batch 001 municipality order/scope changed');
if(batch.closure?.remainingHumanItems!==0)fail('Batch 001 must close with no unresolved owner items');
const openBatch=reviews.filter(x=>x.id.startsWith('batch001-')&&['open','in-review'].includes(x.status));
if(openBatch.length!==0)fail(`Expected no open Batch 001 reviews, got ${openBatch.length}`);
for(const id of ['batch001-aa-en-hunze-source','batch001-achtkarspelen-taxonomy','batch001-albrandswaard-taxonomy','batch001-alphen-source']){
 if(reviews.find(x=>x.id===id)?.status!=='resolved')fail(`${id} must be resolved`);
}
for(const finding of batch.findings){
 const url=finding.officialApplicationUrl;
 if(url&&!/^(https:\/\/|mailto:)/.test(url))fail(`${finding.id}: application route is neither HTTPS nor a verified municipal email route`);
 if(url&&finding.applicationRouteStatus==='not-confirmed')fail(`${finding.id}: URL present but unconfirmed`);
 if(finding.applicationRouteStatus?.startsWith('verified')&&!url)fail(`${finding.id}: verified route has no URL`);
 if(['development-specific','development-specific-regional'].includes(finding.geographicScope?.method)&&finding.substantiveVerificationStatus==='public-decision')fail(`${finding.id}: development-only rule activated publicly`);
}
if(params.length!==6)fail('Expected six tracked annual parameters');
for(const p of params){
 if(!p.source.startsWith('https://')||!p.validFrom||!p.validUntil||!p.nextExpectedUpdate)fail(`${p.id}: incomplete parameter provenance`);
 if(p.year<2026&&p.status!=='expired-do-not-use')fail(`${p.id}: historical parameter is not blocked`);
}
if(negative.requiredProcedure.length<6)fail('Negative-source procedure is incomplete');
if(!negative.results.some(x=>x.municipalityCode==='GM1680'&&x.status==='no-current-municipal-regulation-confirmed'))fail('Aa en Hunze negative-source result missing');
if(!negative.results.some(x=>x.municipalityCode==='GM0484'&&x.status==='current-regional-regulation-found'))fail('Alphen correction missing');
console.log(`PASS: Batch 001 closed; ${openBatch.length} targeted human items; ${params.length} annual parameters; Batch 002 untouched`);

