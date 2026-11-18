import assert from "node:assert/strict";
import fs from "node:fs";
import {buildAddressContext,evaluateRule,isApplicationRouteRelevant,STATES} from "../assets/applicability.js";
const records=JSON.parse(fs.readFileSync("data/regulations.json","utf8")).records;
const op=records.find(x=>x.id==="leiden-opkoop-2024"),om=records.find(x=>x.id==="leiden-omzetting-2024");
const context=(neighborhood,postcode="2315SW",street="Trompstraat")=>({municipality:{code:"GM0546"},location:{neighborhoodName:neighborhood,districtName:"Binnenstad-Noord"},address:{postcode,street,houseNumber:51},property:{wozValue:null}});
const synthetic=condition=>({conflictStatus:"none-found",applicability:{conclusiveWhenMatched:true,matchMessage:"match",geographicNoMatchMessage:"no",conditions:[condition]}});
assert.equal(evaluateRule(synthetic({id:"m",category:"geographic",conditionType:"municipality",source:"official-data",fact:"municipality.code",operator:"equals",value:"GM0546"}),context("De Waard")).state,STATES.APPLICABLE);
assert.equal(evaluateRule(synthetic({id:"s",category:"geographic",conditionType:"street",source:"official-data",fact:"address.street",operator:"in",values:["Trompstraat"]}),context("De Waard")).state,STATES.APPLICABLE);
assert.equal(evaluateRule(synthetic({id:"p",category:"geographic",conditionType:"postcode",source:"official-data",fact:"address.postcode",operator:"equals",value:"2315SW"}),context("De Waard")).state,STATES.APPLICABLE);
assert.equal(evaluateRule(synthetic({id:"n",category:"geographic",conditionType:"neighborhood",source:"official-data",fact:"location.neighborhoodName",operator:"in",values:["De Waard"]}),context("De Waard")).state,STATES.APPLICABLE);
assert.equal(evaluateRule(synthetic({id:"v",category:"property",conditionType:"woz-value",source:"official-data",fact:"property.wozValue",operator:"<=",value:450000}),{...context("De Waard"),property:{wozValue:400000}}).state,STATES.APPLICABLE);
assert.equal(evaluateRule(synthetic({id:"v",category:"property",conditionType:"woz-value",source:"official-data",fact:"property.wozValue",operator:"<=",value:450000}),context("De Waard")).state,STATES.INSUFFICIENT);
const question=synthetic({id:"q",category:"situation",conditionType:"occupants",source:"user-input",operator:"equals",value:"yes",question:"?"});assert.equal(evaluateRule(question,context("De Waard")).state,STATES.QUESTIONS);
assert.equal(evaluateRule(synthetic({id:"n",category:"geographic",conditionType:"neighborhood",source:"official-data",fact:"location.neighborhoodName",operator:"in",values:["De Waard"]}),context("Hoge Mors")).state,STATES.NOT_APPLICABLE);
assert.equal(evaluateRule({...synthetic({id:"m",category:"geographic",conditionType:"municipality",source:"official-data",fact:"municipality.code",operator:"equals",value:"GM0546"}),conflictStatus:"conflict — manual review required"},context("De Waard")).state,STATES.REVIEW);
assert.notEqual(evaluateRule(op,context("Hoge Mors")).state,STATES.APPLICABLE);
assert.equal(evaluateRule(om,context("Hoge Mors")).state,STATES.REVIEW);
assert.equal(evaluateRule(om,context("De Waard")).state,STATES.REVIEW);
const bag=buildAddressContext({postcode:"2315SW",huisnummer:51,straatnaam:"Trompstraat",weergavenaam:"Trompstraat 51",buurtnaam:"De Waard",buurtcode:"BU05460109",wijknaam:"Binnenstad-Noord",wijkcode:"WK054601",gemeentecode:"0546",gemeentenaam:"Leiden",adresseerbaarobject_id:"0546010000027941",centroide_ll:"POINT(4.508 52.158)"});assert.equal(bag.municipality.code,"GM0546");assert.equal("residents" in bag.property,false);
const app=fs.readFileSync("assets/app.js","utf8");assert(!app.includes("not reviewed"));assert(!/BRP|bewonersregister/.test(app));
assert(!isApplicationRouteRelevant({state:STATES.QUESTIONS}));assert(!isApplicationRouteRelevant({state:STATES.NOT_APPLICABLE}));assert(isApplicationRouteRelevant({state:STATES.POTENTIAL}));assert(isApplicationRouteRelevant({state:STATES.APPLICABLE}));
// Vervolgvragen (2026-11-18): "Weet ik niet", onNoMatch, eigen nee-uitleg, postcodeprefix.
{const base={conflictStatus:"none-found",applicability:{conclusiveWhenMatched:true,matchMessage:"geldt",geographicNoMatchMessage:"buiten",conditions:[{id:"m",category:"geographic",conditionType:"municipality",source:"official-data",fact:"municipality.code",operator:"equals",value:"GM0546"},{id:"a",category:"situation",conditionType:"x",source:"user-input",operator:"equals",value:"yes",question:"A?",answerType:"yes-no",noMatchMessage:"Eigen uitleg A."},{id:"b",category:"property",conditionType:"woz-value",source:"user-input",operator:"equals",value:"yes",question:"B?",answerType:"yes-no-unknown",noMatchMessage:"Eigen uitleg B.",uncertainMessage:"de WOZ-waarde."}]}};
const ctx=context("De Waard");
let e=evaluateRule(base,ctx,{a:"no"});assert.equal(e.state,STATES.NOT_APPLICABLE);assert.equal(e.reason,"Eigen uitleg A.");
e=evaluateRule(base,ctx,{a:"yes"});assert.equal(e.state,STATES.QUESTIONS);assert.equal(e.questions[0].id,"b");
e=evaluateRule(base,ctx,{a:"yes",b:"unknown"});assert.equal(e.state,STATES.POTENTIAL,"Weet ik niet mag nooit 'geldt niet' opleveren");assert.match(e.reason,/Nog niet zeker: de WOZ-waarde\./);
e=evaluateRule(base,ctx,{a:"yes",b:"yes"});assert.equal(e.state,STATES.APPLICABLE);
const soft=structuredClone(base);soft.applicability.conditions[2].onNoMatch="uncertain";
assert.equal(evaluateRule(soft,ctx,{a:"yes",b:"no"}).state,STATES.POTENTIAL,"onNoMatch=uncertain mag niet uitsluiten");
const pre={conflictStatus:"none-found",applicability:{...base.applicability,conditions:[{id:"pc",category:"geographic",conditionType:"postcode",source:"official-data",fact:"address.postcode",operator:"prefix-in",values:["7411","7417"]},base.applicability.conditions[1]]}};
assert.equal(evaluateRule(pre,context("x","7417AB"),{a:"yes"}).state,STATES.APPLICABLE);
assert.equal(evaluateRule(pre,context("x","7418AB"),{a:"yes"}).state,STATES.NOT_APPLICABLE);}
// Elke regel met vervolgvragen: het ja-pad eindigt in een conclusie, elk nee-antwoord sluit uit of maakt onzeker, nooit een stille fout.
{const {validateApplicability}=await import("./apply-applicability.mjs");let n=0;
for(const r of records.filter(x=>x.applicability)){if(!r.id.startsWith("leiden-o"))assert.deepEqual(validateApplicability(r.id,r.applicability),[],r.id);
 const ctx={municipality:{code:r.municipalityCode},location:{},address:{postcode:(r.applicability.conditions.find(c=>c.operator==="prefix-in")?.values[0]||"1234")+"AB",street:"Teststraat",houseNumber:1},property:{}};
 const qs=r.applicability.conditions.filter(c=>c.source==="user-input");const happy=Object.fromEntries(qs.map(c=>[c.id,c.value]));
 const rr={...r,geographicScope:undefined};
 const end=evaluateRule(rr,ctx,happy);assert(r.id.startsWith("leiden-o")||[STATES.APPLICABLE,STATES.POTENTIAL].includes(end.state),`${r.id}: ja-pad eindigt in ${end.state}`);
 if(!r.id.startsWith("leiden-o"))assert.equal(end.state,r.applicability.conclusiveWhenMatched?STATES.APPLICABLE:STATES.POTENTIAL,r.id);
 for(const c of qs){const other=c.value==="yes"?"no":"yes";const e=evaluateRule(rr,ctx,{...happy,[c.id]:other});
  assert.equal(e.state,c.onNoMatch==="uncertain"?STATES.POTENTIAL:STATES.NOT_APPLICABLE,`${r.id}/${c.id}`);
  if(c.answerType==="yes-no-unknown")assert.equal(evaluateRule(rr,ctx,{...happy,[c.id]:"unknown"}).state,STATES.POTENTIAL,`${r.id}/${c.id} unknown`);}
 n++;}
assert(n>=86,`verwacht minstens 86 regels met vervolgvragen, kreeg ${n}`);}
console.log("PASS applicability: municipality, street, postcode, neighbourhood, value, missing data, questions, no-match, conflict, Leiden pilots, privacy and public language; vervolgvragen voor alle regels (ja-pad, nee-pad, weet ik niet)");
