import {evaluateGeographicScope} from "./geography.js?v=20260809-geography";
"use strict";
export const STATES={APPLICABLE:"applicable",POTENTIAL:"potentially-applicable",NOT_APPLICABLE:"not-applicable",QUESTIONS:"additional-information-required",GEO_MATCH:"geographic-match",GEO_NO_MATCH:"geographic-no-match",INSUFFICIENT:"insufficient-data",REVIEW:"manual-review-required"};
const normalize=value=>String(value??"").trim().toLowerCase();
const fact=(context,path)=>path.split(".").reduce((value,key)=>value?.[key],context);
export function buildAddressContext(address,property={}){const point=String(address.centroide_ll||"").match(/POINT\(([-\d.]+) ([-\d.]+)\)/);return {address:{postcode:address.postcode,houseNumber:address.huisnummer,street:address.straatnaam,displayName:address.weergavenaam},location:{longitude:point?Number(point[1]):null,latitude:point?Number(point[2]):null,neighborhoodCode:address.buurtcode||null,neighborhoodName:address.buurtnaam||null,districtCode:address.wijkcode||null,districtName:address.wijknaam||null},property:{bagObjectId:address.adresseerbaarobject_id||null},municipality:{code:`GM${String(address.gemeentecode||"").replace(/^GM/,"").padStart(4,"0")}`,name:address.gemeentenaam},officialData:{address:{authority:"Kadaster / BAG via PDOK",retrievedAt:new Date().toISOString()}},unknownFacts:[],userAnswers:{}}}
function evaluateCondition(c,context,answers){const value=c.source==="user-input"?answers[c.id]:fact(context,c.fact);if(value===undefined||value===null||value==="")return {status:"unknown",condition:c};let matched=false;if(c.operator==="equals")matched=normalize(value)===normalize(c.value);if(c.operator==="in")matched=c.values.map(normalize).includes(normalize(value));if(c.operator==="<=")matched=Number(value)<=Number(c.value);return {status:matched?"match":"no-match",condition:c,value}}
export function evaluateRule(rule,context={},answers={}){
  if(rule.geographicScope){
    const geographic=evaluateGeographicScope(rule.geographicScope,context,rule.municipalityCode);
    if(geographic.status==="no-match")return {state:STATES.NOT_APPLICABLE,geographicState:STATES.GEO_NO_MATCH,reason:"Deze regel geldt niet voor dit adres.",questions:[],geographic};
    if(geographic.status==="manual-review-required")return {state:STATES.REVIEW,reason:"We kunnen nog niet automatisch bepalen of dit adres binnen het officieel aangewezen gebied ligt.",questions:[],geographic};
    if(geographic.status==="unknown")return {state:STATES.INSUFFICIENT,reason:"Niet alle benodigde geografische gegevens zijn beschikbaar.",questions:[],geographic}
  }
  if(rule.conflictStatus?.startsWith("conflict"))return {state:STATES.REVIEW,reason:"Officiële bronnen spreken elkaar tegen.",questions:[]};
  if(!rule.applicability)return {state:STATES.INSUFFICIENT,reason:"Voor deze regel is de adrescontrole nog niet ingericht.",questions:[]};
  const results=rule.applicability.conditions.map(c=>evaluateCondition(c,context,answers));
  const geo=results.filter(x=>x.condition.category==="geographic");
  if(geo.some(x=>x.status==="no-match"))return {state:STATES.NOT_APPLICABLE,geographicState:STATES.GEO_NO_MATCH,reason:rule.applicability.geographicNoMatchMessage||"Dit adres ligt buiten het aangewezen gebied.",questions:[],results};
  if(results.filter(x=>x.condition.source!=="user-input").some(x=>x.status==="unknown"))return {state:STATES.INSUFFICIENT,reason:"Niet alle benodigde officiële objectgegevens zijn beschikbaar.",questions:[],results};

  // Beslisboom: een reeds beantwoorde uitsluitende voorwaarde stopt de regel direct.
  // Hierdoor worden vervolgvragen niet meer getoond als ze juridisch niet meer relevant zijn.
  const answeredUserNoMatch=results.find(x=>x.condition.source==="user-input"&&x.status==="no-match");
  if(answeredUserNoMatch)return {state:STATES.NOT_APPLICABLE,reason:"Op basis van uw antwoord is deze regel voor uw voorgenomen gebruik niet van toepassing.",questions:[],results,stoppedBy:answeredUserNoMatch.condition.id};

  const unanswered=results.filter(x=>x.condition.source==="user-input"&&x.status==="unknown");
  if(unanswered.length)return {state:STATES.QUESTIONS,geographicState:STATES.GEO_MATCH,reason:"Voor dit adres is nog informatie over uw situatie nodig.",questions:unanswered.map(x=>x.condition),results};
  if(results.some(x=>x.status==="no-match"))return {state:STATES.NOT_APPLICABLE,reason:"Uw antwoorden sluiten deze regel uit.",questions:[],results};
  return {state:rule.applicability.conclusiveWhenMatched?STATES.APPLICABLE:STATES.POTENTIAL,geographicState:STATES.GEO_MATCH,reason:rule.applicability.matchMessage,questions:[],results}
}
export function groupEvaluations(items){return {applicable:items.filter(x=>x.evaluation.state===STATES.APPLICABLE),potential:items.filter(x=>[STATES.POTENTIAL,STATES.QUESTIONS,STATES.INSUFFICIENT,STATES.REVIEW].includes(x.evaluation.state)),notApplicable:items.filter(x=>x.evaluation.state===STATES.NOT_APPLICABLE)}}
export function isApplicationRouteRelevant(evaluation){return [STATES.APPLICABLE,STATES.POTENTIAL].includes(evaluation?.state)}
