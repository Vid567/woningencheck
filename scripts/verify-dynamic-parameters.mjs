import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/dynamic-parameters.json','utf8')).parameters;
const today=process.env.PARAMETER_CHECK_DATE||new Date().toISOString().slice(0,10);
const commonRequired=['id','classification','name','year','value','unit','validFrom','validUntil','updateMethod','source','lastVerifiedAt','nextExpectedUpdate','updateFrequency','status'];
const errors=[];
const ids=new Set(data.map(p=>p.id));
for(const p of data){
 for(const k of commonRequired)if(p[k]===undefined||p[k]===null||p[k]==='')errors.push(`${p.id}: missing ${k}`);
 const isGlobalNational=p.classification==='national-indexed'&&!p.municipalityCode;
 if(!isGlobalNational){
  if(!p.municipalityCode)errors.push(`${p.id}: missing municipalityCode`);
  if(!p.regulationId)errors.push(`${p.id}: missing regulationId`);
 }
 if(p.municipalityCode&&!/^GM\d{4}$/.test(String(p.municipalityCode)))errors.push(`${p.id}: invalid municipalityCode ${p.municipalityCode}`);
 if(!String(p.source||'').startsWith('https://'))errors.push(`${p.id}: source is not HTTPS`);
 if(p.thresholdRef&&!ids.has(p.thresholdRef))errors.push(`${p.id}: thresholdRef ${p.thresholdRef} does not exist`);
 if(p.thresholdRef&&p.thresholdRef===p.id)errors.push(`${p.id}: thresholdRef may not reference itself`);
 if(p.status==='current'&&p.validUntil<today)errors.push(`${p.id}: current value expired on ${p.validUntil}; publish the new official value before decisions continue`);
 if(p.status==='expired-do-not-use'&&p.validUntil>=today)errors.push(`${p.id}: blocked value has not expired yet`);
}
const currentRegulations=new Set(data.filter(p=>p.status==='current'&&p.regulationId).map(p=>p.regulationId));
for(const p of data.filter(p=>p.updateFrequency==='annual'&&p.status==='expired-do-not-use'&&p.validUntil<today)){
 if(p.regulationId&&!currentRegulations.has(p.regulationId))console.warn(`MONITOR: ${p.regulationId} has only an expired reference value; it remains blocked from use.`);
}
if(errors.length)throw new Error(errors.join('\n'));
console.log(`PASS dynamic parameters: ${data.length} tracked; national and municipal classifications valid on ${today}; expired references blocked`);
