import {evaluateGeographicScope} from "./geography.js?v=20260813-address-context";
"use strict";
export const STATES={APPLICABLE:"applicable",POTENTIAL:"potentially-applicable",NOT_APPLICABLE:"not-applicable",QUESTIONS:"additional-information-required",GEO_MATCH:"geographic-match",GEO_NO_MATCH:"geographic-no-match",INSUFFICIENT:"insufficient-data",REVIEW:"manual-review-required"};
const normalize=value=>String(value??"").trim().toLowerCase();
const fact=(context,path)=>path.split(".").reduce((value,key)=>value?.[key],context);
const cleanMunicipalityCode=value=>{const raw=String(value??"").replace(/^GM/i,"").replace(/\D/g,"");return raw?`GM${raw.padStart(4,"0")}`:null};
const bagUses=address=>{let uses=address.gebruiksdoel??address.gebruiksdoelen??address.gebruiksdoel_verblijfsobject??[];if(typeof uses==="string")uses=uses.split(/[;,]/).map(x=>x.trim()).filter(Boolean);return Array.isArray(uses)?uses:[]};
export function buildAddressContext(address,property={}){
 const point=String(address.centroide_ll||"").match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
 const houseNumberAddition=`${address.huisletter||""}${address.huisnummertoevoeging||""}`.trim();
 const municipalityCode=cleanMunicipalityCode(property.municipalityCode)||cleanMunicipalityCode(address.gemeentecode||address.gemeente_code);
 const municipalityName=property.municipalityName||address.gemeentenaam||null;
 const usePurposes=bagUses(address);
 return {
  address:{postcode:address.postcode,houseNumber:address.huisnummer,houseNumberAddition,addition:houseNumberAddition,street:address.straatnaam,displayName:address.weergavenaam},
  location:{longitude:point?Number(point[1]):null,latitude:point?Number(point[2]):null,neighborhoodCode:address.buurtcode||null,neighborhoodName:address.buurtnaam||null,districtCode:address.wijkcode||null,districtName:address.wijknaam||null,municipalAreaName:property.municipalAreaName||address.buurtnaam||address.wijknaam||null},
  property:{...property,municipalityCode:undefined,municipalityName:undefined,municipalAreaName:undefined,bagObjectId:property.bagObjectId||address.adresseerbaarobject_id||null,bagPandId:property.bagPandId||address.pand_id||null,usePurposes:property.usePurposes||usePurposes,usePurpose:property.usePurpose||(usePurposes.length===1?usePurposes[0]:null)},
  municipality:{code:municipalityCode,name:municipalityName},
  officialData:{address:{authority:"Kadaster / BAG via PDOK",retrievedAt:new Date().toISOString()}},
  unknownFacts:[],userAnswers:{}
 }
}
function evaluateCondition(c,context,answers){const value=c.source==="user-input"?answers[c.id]:fact(context,c.fact);if(value===undefined||value===null||value==="")return {status:"unknown",condition:c};let matched=false;if(c.operator==="equals")matched=normalize(value)===normalize(c.value);if(c.operator==="in")matched=c.values.map(normalize).includes(normalize(value));if(c.operator==="<=")matched=Number(value)<=Number(c.value);return {status:matched?"match":"no-match",condition:c,value}}
export function evaluateRule(rule,context={},answers={}){
 if(rule.geographicScope){const geographic=evaluateGeographicScope(rule.geographicScope,context,rule.municipalityCode);if(geographic.status==="no-match")return{state:STATES.NOT_APPLICABLE,geographicState:STATES.GEO_NO_MATCH,reason:"Deze regel geldt niet voor dit adres.",questions:[],geographic};if(geographic.status==="manual-review-required")return{state:STATES.REVIEW,reason:"We kunnen nog niet automatisch bepalen of dit adres binnen het officieel aangewezen gebied ligt.",questions:[],geographic};if(geographic.status==="unknown")return{state:STATES.INSUFFICIENT,reason:"Niet alle benodigde geografische gegevens zijn beschikbaar.",questions:[],geographic}}
 if(rule.conflictStatus?.startsWith("conflict"))return{state:STATES.REVIEW,reason:"Officiële bronnen spreken elkaar tegen.",questions:[]};
 if(!rule.applicability)return{state:STATES.INSUFFICIENT,reason:"Voor deze regel is de adrescontrole nog niet ingericht.",questions:[]};
 const results=rule.applicability.conditions.map(c=>evaluateCondition(c,context,answers));
 const geo=results.filter(x=>x.condition.category==="geographic");
 if(geo.some(x=>x.status==="no-match"))return{state:STATES.NOT_APPLICABLE,geographicState:STATES.GEO_NO_MATCH,reason:rule.applicability.geographicNoMatchMessage||"Dit adres ligt buiten het aangewezen gebied.",questions:[],results};
 if(results.filter(x=>x.condition.source!=="user-input").some(x=>x.status==="unknown"))return{state:STATES.INSUFFICIENT,reason:"Niet alle benodigde officiële objectgegevens zijn beschikbaar.",questions:[],results};
 const userResults=results.filter(x=>x.condition.source==="user-input");
 const answeredNoMatch=userResults.find(x=>x.status==="no-match");
 if(answeredNoMatch)return{state:STATES.NOT_APPLICABLE,reason:"Op basis van uw antwoord is deze regel voor uw voorgenomen gebruik niet van toepassing.",questions:[],results,stoppedBy:answeredNoMatch.condition.id};
 // AND-beslisregels worden stap voor stap doorlopen. Alleen de eerstvolgende
 // onbeantwoorde vraag wordt getoond. Zo verdwijnen latere vragen direct zodra
 // een eerdere noodzakelijke voorwaarde met Nee wordt beantwoord.
 const nextUnanswered=userResults.find(x=>x.status==="unknown");
 if(nextUnanswered)return{state:STATES.QUESTIONS,geographicState:STATES.GEO_MATCH,reason:"Beantwoord de volgende vraag om deze regel verder te controleren.",questions:[nextUnanswered.condition],results};
 if(results.some(x=>x.status==="no-match"))return{state:STATES.NOT_APPLICABLE,reason:"Uw antwoorden sluiten deze regel uit.",questions:[],results};
 return{state:rule.applicability.conclusiveWhenMatched?STATES.APPLICABLE:STATES.POTENTIAL,geographicState:STATES.GEO_MATCH,reason:rule.applicability.matchMessage,questions:[],results}
}
export function groupEvaluations(items){return{applicable:items.filter(x=>x.evaluation.state===STATES.APPLICABLE),potential:items.filter(x=>[STATES.POTENTIAL,STATES.QUESTIONS,STATES.INSUFFICIENT,STATES.REVIEW].includes(x.evaluation.state)),notApplicable:items.filter(x=>x.evaluation.state===STATES.NOT_APPLICABLE)}}
export function isApplicationRouteRelevant(evaluation){return[STATES.APPLICABLE,STATES.POTENTIAL].includes(evaluation?.state)}
