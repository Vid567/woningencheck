import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>JSON.parse(fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
const municipalities=read('data/municipalities-2026.json').municipalities||[];
const regulations=read('data/regulations.json').records||[];
const goals={
 rent:{label:'Gehele woning verhuren',terms:['opkoopbescherming','verhuurvergunning','gehele woning'],exclude:/kamer|woningdel|omzetting|omzettingsvergunning/i},
 rooms:{label:'Kamers verhuren / woning delen',terms:['kamer','woningdel','omzet','onzelfstandig']},
 split:{label:'Woning splitsen',terms:['splits','woningvorm']},
 holiday:{label:'Vakantieverhuur / Airbnb',terms:['vakantie','toeristisch','airbnb']},
 tohome:{label:'Pand naar woning veranderen',terms:['omgevingsplan','functie','gebruik','wonen']},
 renovate:{label:'Verbouwen',terms:['verbouw','bouw','omgevingsplan']},
 explore:{label:'Alle mogelijkheden voor dit adres bekijken',terms:[]}
};
const text=r=>[r.title,r.regulationType,r.canonicalType,r.shortDescription].filter(Boolean).join(' ').toLowerCase();
const relevant=(r,g)=>{if(g==='explore')return true;const h=text(r),cfg=goals[g];if(cfg.exclude?.test(h))return false;return cfg.terms.some(t=>h.includes(t))};
const generic='Beschikbare informatie voor dit doel';
const findings=[];let combinations=0,withRules=0,withoutRules=0;
assert.equal(municipalities.length,342,'matrix vereist exact 342 gemeenten');
for(const m of municipalities){
 const local=regulations.filter(r=>r.municipalityCode===m.code);
 for(const [goal,cfg] of Object.entries(goals)){
  combinations++;
  const matched=local.filter(r=>relevant(r,goal));
  if(matched.length)withRules++;else withoutRules++;
  for(const r of matched){
   if(!r.officialRegulationUrl&&!r.officialInformationUrl) findings.push({severity:'WARN',type:'bron/route',municipality:m.name,code:m.code,goal,rule:r.id,message:'relevante regel zonder officiële informatie- of regelgevingslink'});
   if(r.applicability?.conditions?.some(c=>c.source==='user-input')){
    const qs=r.applicability.conditions.filter(c=>c.source==='user-input').map(c=>`${c.id||''} ${c.question||''}`.toLowerCase());
    if(goal==='rent'&&qs.some(q=>/wilt.*verhur|woning.*verhur/.test(q))) findings.push({severity:'FAIL',type:'dubbele-vraag',municipality:m.name,code:m.code,goal,rule:r.id,message:'verhuurintentie uit stap 2 wordt opnieuw gevraagd'});
    if(goal==='split'&&qs.some(q=>/wilt.*splits|woning.*splits/.test(q))) findings.push({severity:'FAIL',type:'dubbele-vraag',municipality:m.name,code:m.code,goal,rule:r.id,message:'splitsintentie uit stap 2 wordt opnieuw gevraagd'});
    if(goal==='holiday'&&qs.some(q=>/vakantie.*verhur|airbnb|toeristisch.*verhur/.test(q))) findings.push({severity:'FAIL',type:'dubbele-vraag',municipality:m.name,code:m.code,goal,rule:r.id,message:'vakantieverhuurintentie uit stap 2 wordt opnieuw gevraagd'});
    if(goal==='renovate'&&qs.some(q=>/wilt.*verbouw|gaat.*verbouw/.test(q))) findings.push({severity:'FAIL',type:'dubbele-vraag',municipality:m.name,code:m.code,goal,rule:r.id,message:'verbouwintentie uit stap 2 wordt opnieuw gevraagd'});
   }
  }
  // A matched rule means the UI must never fall back to a contentless generic result.
  if(matched.length&&cfg.label===generic) findings.push({severity:'FAIL',type:'ui-fallback',municipality:m.name,code:m.code,goal,message:'concrete regels bestaan maar generieke fallback zou worden gebruikt'});
 }
}
// Golden regression: the known Leiden address must have concrete data for the goals reported by the user.
const leiden=municipalities.find(m=>m.code==='GM0546');assert.ok(leiden,'Leiden ontbreekt');
for(const goal of ['rent','rooms','split','holiday','renovate']){
 const matched=regulations.filter(r=>r.municipalityCode==='GM0546'&&relevant(r,goal));
 if(!matched.length)findings.push({severity:'FAIL',type:'mapping/data',municipality:'Leiden',code:'GM0546',goal,address:'2315SW 51',message:`geen concrete ${goals[goal].label}-regel gemapt voor bekende golden case`});
}
const fails=findings.filter(x=>x.severity==='FAIL'),warns=findings.filter(x=>x.severity==='WARN');
const report={generatedAt:new Date().toISOString(),municipalities:municipalities.length,goals:Object.keys(goals).length,combinations,withMappedRules:withRules,withoutMappedRules:withoutRules,failures:fails.length,warnings:warns.length,findings};
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../artifacts/goal-matrix-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(`GOAL MATRIX: ${municipalities.length} gemeenten × ${Object.keys(goals).length} doelen = ${combinations} combinaties`);
console.log(`Mapped: ${withRules} · zonder gemapte lokale regel: ${withoutRules} · FAIL: ${fails.length} · WARN: ${warns.length}`);
for(const x of findings.slice(0,100))console.log(`${x.severity} ${x.type} ${x.code} ${x.goal}${x.rule?` ${x.rule}`:''}: ${x.message}`);
if(findings.length>100)console.log(`... ${findings.length-100} aanvullende bevindingen staan in artifacts/goal-matrix-report.json`);
if(fails.length)process.exitCode=1;
