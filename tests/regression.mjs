import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateRule,STATES} from '../assets/applicability.js';

const read=p=>JSON.parse(fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
const regs=read('data/regulations.json').records||[];
const municipalities=read('data/municipalities-2026.json').municipalities||[];
const confidence=read('data/source-confidence-municipalities.json');
const locationRules=read('data/location-rules.json').records||[];

let passed=0, failed=0, warnings=0;
function test(name,fn){try{fn();console.log(`PASS  ${name}`);passed++}catch(e){console.error(`FAIL  ${name}\n      ${e.message}`);failed++}}
function warn(name,msg){console.warn(`WARN  ${name}: ${msg}`);warnings++}
const context=(code,name='Testgemeente',postcode='1234AB')=>({municipality:{code,name},address:{postcode,houseNumber:1,street:'Teststraat'},location:{},property:{}});

console.log('\n=== Woningencheck regressietest ===');

test('342 gemeenten aanwezig',()=>assert.equal(municipalities.length,342));
test('gemeentecodes zijn uniek',()=>assert.equal(new Set(municipalities.map(x=>x.code)).size,342));
test('landelijke audit dekt 342 gemeenten',()=>assert.equal(Object.keys(confidence.municipalities||{}).length,342));
test('landelijke audit representeert 799 bronrecords',()=>assert.equal(Number(confidence.records),799));
test('alle auditgemeenten hebben minimaal één bron',()=>assert.equal(Object.values(confidence.municipalities||{}).filter(x=>!x.n).length,0));
test('alle beslisregels hebben gemeente en titel',()=>assert.equal(regs.filter(r=>!r.id||!r.municipalityCode||!r.title).length,0));
test('alle beslisregel-IDs zijn uniek',()=>assert.equal(new Set(regs.map(r=>r.id)).size,regs.length));
test('officiële regelgevingslinks gebruiken https',()=>assert.equal(regs.filter(r=>r.officialRegulationUrl&&!r.officialRegulationUrl.startsWith('https://')).length,0));
test('officiële informatielinks gebruiken https',()=>assert.equal(regs.filter(r=>r.officialInformationUrl&&!r.officialInformationUrl.startsWith('https://')).length,0));
test('aanvraaglinks gebruiken https',()=>assert.equal(regs.filter(r=>r.officialApplicationUrl&&!r.officialApplicationUrl.startsWith('https://')).length,0));

const leiden=regs.find(r=>r.id==='leiden-opkoop-2024'||(r.municipalityCode==='GM0546'&&String(r.title).toLowerCase().includes('opkoop')));
test('Leiden opkoopbescherming zit in de beslisdatabase',()=>assert.ok(leiden));
if(leiden?.applicability){
 const users=leiden.applicability.conditions.filter(c=>c.source==='user-input');
 test('Leiden opkoopbescherming heeft gebruikersvoorwaarden',()=>assert.ok(users.length>=2));
 test('beslisboom toont slechts één vraag tegelijk',()=>{const e=evaluateRule(leiden,context('GM0546','Leiden','2315SW'),{});assert.ok([STATES.QUESTIONS,STATES.INSUFFICIENT,STATES.REVIEW].includes(e.state));if(e.state===STATES.QUESTIONS)assert.equal(e.questions.length,1)});
 if(users[0]) test('Nee op eerste noodzakelijke Leiden-vraag stopt vervolgvragen',()=>{const e=evaluateRule(leiden,context('GM0546','Leiden','2315SW'),{[users[0].id]:'no'});assert.equal(e.state,STATES.NOT_APPLICABLE);assert.equal(e.questions.length,0)});
 if(users[1]) test('Nee op tweede noodzakelijke Leiden-vraag stopt vervolgvragen',()=>{const answers={[users[0].id]:String(users[0].value??'yes'),[users[1].id]:'no'};const e=evaluateRule(leiden,context('GM0546','Leiden','2315SW'),answers);assert.equal(e.state,STATES.NOT_APPLICABLE);assert.equal(e.questions.length,0)});
}

test('Leiden 2315SW heeft officiële locatie-override',()=>{const x=locationRules.find(x=>x.municipalityCode==='GM0546'&&x.postcode==='2315SW');assert.ok(x);assert.equal(x.rules?.conversionPermit,true)});

// 20 representatieve logicascenario's uit echte beslisregels met gebruikersvragen.
const candidates=regs.filter(r=>r.applicability?.conditions?.some(c=>c.source==='user-input')).slice(0,20);
test('minimaal 15 echte beslisregels beschikbaar voor regressieset',()=>assert.ok(candidates.length>=15));
candidates.forEach((r,i)=>test(`scenario ${String(i+1).padStart(2,'0')} · ${r.municipalityName||r.municipalityCode} · ${r.title}`,()=>{
 const c=context(r.municipalityCode,r.municipalityName||'Gemeente');
 const e0=evaluateRule(r,c,{});
 assert.ok(Object.values(STATES).includes(e0.state));
 const user=r.applicability.conditions.find(x=>x.source==='user-input');
 if(user){const eNo=evaluateRule(r,c,{[user.id]:'__definitely_not_expected__'});assert.equal(eNo.state,STATES.NOT_APPLICABLE);assert.equal(eNo.questions.length,0)}
}));

// QA-signalen: bewust waarschuwingen, omdat ontbreken niet altijd een fout is.
const noApplication=regs.filter(r=>!r.officialApplicationUrl).length;
const geoNeedsMachine=regs.filter(r=>r.geographicScopeReview&&r.geographicScopeReview!=='fully-verified').length;
const noEnd=regs.filter(r=>r.temporal&&!r.temporal.validUntil).length;
if(noApplication)warn('aanvraagroutes',`${noApplication} beslisregels hebben geen afzonderlijke aanvraaglink; inhoudelijk beoordelen`);
if(geoNeedsMachine)warn('geografische koppelingen',`${geoNeedsMachine} beslisregels zijn nog niet volledig geografisch machineleesbaar`);
if(noEnd)warn('einddatums',`${noEnd} beslisregels hebben geen vaste einddatum; dit kan correct open-ended zijn`);

console.log(`\nRESULTAAT: ${passed} PASS · ${failed} FAIL · ${warnings} WARN`);
if(failed)process.exit(1);
