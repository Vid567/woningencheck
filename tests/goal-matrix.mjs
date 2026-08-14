import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GOAL_DEFINITIONS,ruleRelevantToGoal,inferredAnswerForGoal} from '../assets/goal-router.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
const municipalities=read('data/municipalities-2026.json').municipalities||[];
const regulations=read('data/regulations.json').records||[];
const findings=[];let combinations=0,withRules=0,withoutRules=0;
assert.equal(municipalities.length,342,'matrix vereist exact 342 gemeenten');
for(const m of municipalities){
 const local=regulations.filter(r=>r.municipalityCode===m.code);
 for(const goal of Object.keys(GOAL_DEFINITIONS)){
  combinations++;
  const matched=local.filter(r=>ruleRelevantToGoal(r,goal));
  if(matched.length)withRules++;else withoutRules++;
  for(const r of matched){
   if(!r.officialRegulationUrl&&!r.officialInformationUrl) findings.push({severity:'WARN',type:'bron/route',municipality:m.name,code:m.code,goal,rule:r.id,message:'relevante regel zonder officiële informatie- of regelgevingslink'});
   for(const c of r.applicability?.conditions||[]){
    if(c.source!=='user-input')continue;
    const inherited=inferredAnswerForGoal(goal,c);
    const q=`${c.id||''} ${c.question||''}`.toLowerCase();
    const duplicate=(goal==='rent'&&/wilt.*verhur|woning.*verhur/.test(q)&&!/(kamer|vakantie|toerist|airbnb)/.test(q))||(goal==='rooms'&&/kamer.*verhur|woningdel|woning.*delen|onzelfstandig|omzet/.test(q))||(goal==='split'&&/wilt.*splits|woning.*splits|woningvorm/.test(q))||(goal==='holiday'&&/vakantie.*verhur|toeristisch.*verhur|airbnb/.test(q))||(goal==='tohome'&&/naar.*woning|naar.*wonen|functie.*wonen|gebruik.*wonen/.test(q))||(goal==='renovate'&&/wilt.*verbouw|gaat.*verbouw|bouwkund.*wijzig/.test(q));
    if(duplicate&&inherited!=='yes')findings.push({severity:'FAIL',type:'dubbele-vraag',municipality:m.name,code:m.code,goal,rule:r.id,message:'stap-2-intentie wordt niet automatisch als bekend antwoord overgenomen'});
   }
  }
 }
}
const leiden=municipalities.find(m=>m.code==='GM0546');assert.ok(leiden,'Leiden ontbreekt');
for(const goal of ['rent','rooms','split','holiday','renovate']){
 const matched=regulations.filter(r=>r.municipalityCode==='GM0546'&&ruleRelevantToGoal(r,goal));
 if(!matched.length)findings.push({severity:'DATA-GAP',type:'mapping/data',municipality:'Leiden',code:'GM0546',goal,address:'2315SW 51',message:`geen concrete ${GOAL_DEFINITIONS[goal].label}-regel in huidige dataset; inhoudelijke brondata vereist`});
}
const fails=findings.filter(x=>x.severity==='FAIL'),warns=findings.filter(x=>x.severity==='WARN'),gaps=findings.filter(x=>x.severity==='DATA-GAP');
const report={generatedAt:new Date().toISOString(),municipalities:municipalities.length,goals:Object.keys(GOAL_DEFINITIONS).length,combinations,withMappedRules:withRules,withoutMappedRules:withoutRules,softwareFailures:fails.length,dataGaps:gaps.length,warnings:warns.length,findings};
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../artifacts/goal-matrix-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(`GOAL MATRIX: ${municipalities.length} gemeenten × ${Object.keys(GOAL_DEFINITIONS).length} doelen = ${combinations} combinaties`);
console.log(`Mapped: ${withRules} · zonder gemapte lokale regel: ${withoutRules} · SOFTWARE FAIL: ${fails.length} · DATA-GAP: ${gaps.length} · WARN: ${warns.length}`);
for(const x of findings.slice(0,100))console.log(`${x.severity} ${x.type} ${x.code} ${x.goal}${x.rule?` ${x.rule}`:''}: ${x.message}`);
if(findings.length>100)console.log(`... ${findings.length-100} aanvullende bevindingen staan in artifacts/goal-matrix-report.json`);
if(fails.length)process.exitCode=1;
