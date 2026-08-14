import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/dynamic-parameters.json');
const params=data.parameters||[];
const now=new Date();const year=now.getUTCFullYear();
const outDir=process.env.PARAMETER_AUDIT_OUT||'artifacts/parameter-audit';fs.mkdirSync(outDir,{recursive:true});
const issues=[];
for(const p of params){
 if(!p.id)issues.push({severity:'error',id:null,reason:'parameter zonder id'});
 if(!Number.isFinite(Number(p.value)))issues.push({severity:'error',id:p.id,reason:'waarde ontbreekt of is niet numeriek'});
 if(!p.source||!/^https:\/\//i.test(p.source))issues.push({severity:'error',id:p.id,reason:'officiële bron-URL ontbreekt'});
 if(!p.classification)issues.push({severity:'error',id:p.id,reason:'classification ontbreekt'});
 if(p.updateFrequency==='annual'){
  if(!p.year)issues.push({severity:'review',id:p.id,reason:'jaarlijkse parameter zonder jaar'});
  if(p.status==='current'&&Number(p.year)<year)issues.push({severity:'review',id:p.id,reason:`current parameter hoort bij ${p.year}, huidig jaar is ${year}`});
  if(!p.validFrom||!p.validUntil)issues.push({severity:'review',id:p.id,reason:'jaarlijkse parameter mist geldigheidsperiode'});
  if(!p.nextExpectedUpdate)issues.push({severity:'review',id:p.id,reason:'nextExpectedUpdate ontbreekt'});
  else if(new Date(`${p.nextExpectedUpdate}T00:00:00Z`)<now)issues.push({severity:'review',id:p.id,reason:`verwachte update ${p.nextExpectedUpdate} is verstreken`});
 }
 if(p.thresholdRef&&!params.some(x=>x.id===p.thresholdRef))issues.push({severity:'error',id:p.id,reason:`thresholdRef ${p.thresholdRef} bestaat niet`});
}
const duplicateIds=params.map(x=>x.id).filter((id,i,a)=>id&&a.indexOf(id)!==i);for(const id of new Set(duplicateIds))issues.push({severity:'error',id,reason:'dubbel parameter-id'});
const report={schemaVersion:'1.0.0',mode:'annual-parameter-audit',generatedAt:now.toISOString(),parameterCount:params.length,currentYear:year,errorCount:issues.filter(x=>x.severity==='error').length,reviewCount:issues.filter(x=>x.severity==='review').length,reviewRequired:issues.length>0,issues};
fs.writeFileSync(`${outDir}/annual-parameter-audit.json`,JSON.stringify(report,null,2));
fs.writeFileSync(`${outDir}/annual-parameter-audit.md`,[`# Jaarlijkse parametercontrole`,``,`Parameters: **${params.length}**`,`Fouten: **${report.errorCount}**`,`Handmatige review: **${report.reviewCount}**`,``,`## Controlepunten`,`- NHG en andere landelijke geïndexeerde grenzen`,`- gemeentelijke WOZ-/opkoopgrenzen`,`- huurgrenzen en overige jaarlijkse bedragen`,`- geldigheidsperioden en volgende verwachte update`,`- bron-URL en threshold-referenties`,``,...(issues.length?issues.map(x=>`- **${x.severity}** ${x.id||'(zonder id)'} — ${x.reason}`):['Geen afwijkingen gevonden.'])].join('\n')+'\n');
console.log(`ANNUAL PARAMETER AUDIT: ${params.length} parameters; ${report.errorCount} errors; ${report.reviewCount} review`);
if(report.errorCount)process.exitCode=1;
