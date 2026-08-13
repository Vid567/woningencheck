import assert from "node:assert/strict";
import {buildAddressContext} from "../assets/applicability.js";
import {evaluateGeographicScope} from "../assets/geography.js";

const pdok={
 postcode:"7824AA",huisnummer:12,huisletter:"A",huisnummertoevoeging:"1",straatnaam:"Voorbeeldstraat",weergavenaam:"Voorbeeldstraat 12 A1, 7824AA Emmen",gemeentenaam:"Emmen",gemeentecode:"0114",buurtcode:"BU01140101",buurtnaam:"Bargeres",wijkcode:"WK011401",wijknaam:"Wijk 01",adresseerbaarobject_id:"0106010000000001",pand_id:"0106100000000001",gebruiksdoel:["woonfunctie"],centroide_ll:"POINT(6.9 52.78)"
};
const ctx=buildAddressContext(pdok,{municipalityCode:"GM0114",municipalityName:"Emmen"});
assert.equal(ctx.municipality.code,"GM0114");
assert.equal(ctx.municipality.name,"Emmen");
assert.equal(ctx.address.houseNumberAddition,"A1");
assert.equal(ctx.property.bagObjectId,"0106010000000001");
assert.equal(ctx.property.bagPandId,"0106100000000001");
assert.deepEqual(ctx.property.usePurposes,["woonfunctie"]);
assert.equal(ctx.property.usePurpose,"woonfunctie");
assert.equal(ctx.location.municipalAreaName,"Bargeres");

const evidence=[{municipalityCode:"GM0114",url:"https://lokaleregelgeving.overheid.nl/CVDR698265",section:"gebied"}];
const scope={operator:"AND",conditions:[{type:"municipality",operator:"equals",value:"GM0114",evidence},{type:"municipal-area",operator:"in",values:["Angelslo","Bargeres","Emmerhout","Emmermeer"],evidence}]};
assert.equal(evaluateGeographicScope(scope,ctx,"GM0114").status,"match");

const missingCode={...pdok,gemeentecode:"",gemeente_code:""};
const resolved=buildAddressContext(missingCode,{municipalityCode:"GM0114",municipalityName:"Emmen"});
assert.equal(resolved.municipality.code,"GM0114");
assert.equal(evaluateGeographicScope(scope,resolved,"GM0114").status,"match");
console.log("PASS address context: resolved municipality, BAG facts, additions and Emmen municipal area");
