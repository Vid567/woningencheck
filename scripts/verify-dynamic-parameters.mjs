import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/dynamic-parameters.json','utf8')).parameters;
const today=process.env.PARAMETER_CHECK_DATE||new Date().toISOString().slice(0,10);
const required=['id','municipalityCode','regulationId','name','year','value','unit','validFrom','validUntil','updateMethod','source','lastVerifiedAt','nextExpectedUpdate','updateFrequency','status'];
const errors=[];
for(const p of data){for(const k of required)if(p[k]===undefined||p[k]===null||p[k]==='')errors.push(`${p.id}: missing ${k}`);if(!String(p.source).startsWith('https://'))errors.push(`${p.id}: source is not HTTPS`);if(p.status==='current'&&p.validUntil<today)errors.push(`${p.id}: current value expired on ${p.validUntil}; publish the new official value before decisions continue`);if(p.status==='expired-do-not-use'&&p.validUntil>=today)errors.push(`${p.id}: blocked value has not expired yet`)}
const current=new Set(data.filter(p=>p.status==='current').map(p=>p.regulationId));for(const p of data.filter(p=>p.updateFrequency==='annual'&&p.status==='expired-do-not-use'&&p.validUntil<today))if(!current.has(p.regulationId))console.warn(`MONITOR: ${p.regulationId} has only an expired reference value; it remains blocked from use.`);
if(errors.length)throw new Error(errors.join('\n'));console.log(`PASS dynamic parameters: ${data.length} tracked; current values valid on ${today}; expired references blocked`);
