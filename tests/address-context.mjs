import assert from "node:assert/strict";
import {buildAddressContext} from "../assets/applicability.js";
import {evaluateGeographicScope} from "../assets/geography.js";

const pdok={
 postcode:"7824 AA",huisnummer:12,huisletter:"A",huisnummertoevoeging:"-1",straatnaam:"Voorbeeldstraat",weergavenaam:"Voorbeeldstraat 12 A-1, 7824 AA Emmen",gemeentenaam:"Emmen",gemeentecode:"0114",buurtcode:"BU01140101",buurtnaam:"Bargeres",wijkcode:"WK011401",wijknaam:"Wijk 01",adresseerbaarobject_id:"0106010000000001",pand_id:"0106100000000001",gebruiksdoel:["woonfunctie"],centroide_ll:"POINT(6.9 52.78)"
};
const ctx=buildAddressContext(pdok,{municipalityCode:"GM0114",municipalityName:"Emmen"});
assert.equal(ctx.municipality.code,"GM0114");
assert.equal(ctx.municipality.name,"Emmen");
assert.equal(ctx.address.postcode,"7824AA");
assert.equal(ctx.address.houseNumberAddition,"A1");
assert.equal(ctx.property.bagObjectId,"0106010000000001");
assert.equal(ctx.property.bagPandId,"0106100000000001");
assert.deepEqual(ctx.property.usePurposes,["woonfunctie"]);
assert.equal(ctx.property.usePurpose,"woonfunctie");
assert.equal(ctx.location.municipalAreaName,"Bargeres");

for(const addition of ["H","-H"," H","h"]){
 const variant=buildAddressContext({postcode:"1012 DA",huisnummer:23,huisnummertoevoeging:addition,straatnaam:"Dam",gemeentecode:"0363"},{municipalityCode:"GM0363",municipalityName:"Amsterdam"});
 assert.equal(variant.address.postcode,"1012DA");
 assert.equal(variant.address.houseNumberAddition,"H");
}
const compound=buildAddressContext({postcode:"1012DA",huisnummer:12,huisletter:"A",huisnummertoevoeging:"-1",straatnaam:"Dam",gemeentecode:"0363"},{municipalityCode:"GM0363",municipalityName:"Amsterdam"});
assert.equal(compound.address.houseNumberAddition,"A1");

const evidence=[{municipalityCode:"GM0114",url:"https://lokaleregelgeving.overheid.nl/CVDR698265",section:"gebied"}];
const scope={operator:"AND",conditions:[{type:"municipality",operator:"equals",value:"GM0114",evidence},{type:"municipal-area",operator:"in",values:["Angelslo","Bargeres","Emmerhout","Emmermeer"],evidence}]};
assert.equal(evaluateGeographicScope(scope,ctx,"GM0114").status,"match");

const missingCode={...pdok,gemeentecode:"",gemeente_code:""};
const resolved=buildAddressContext(missingCode,{municipalityCode:"GM0114",municipalityName:"Emmen"});
assert.equal(resolved.municipality.code,"GM0114");
assert.equal(evaluateGeographicScope(scope,resolved,"GM0114").status,"match");

const deventerEvidence=[{municipalityCode:"GM0150",url:"https://lokaleregelgeving.overheid.nl/CVDR756535/1",section:"Artikel 11"}];
const deventerScope={operator:"AND",conditions:[{type:"municipality",operator:"equals",value:"GM0150",evidence:deventerEvidence},{operator:"OR",conditions:[{type:"property-value",operator:"lte",value:470000,fact:"property.wozValue",evidence:deventerEvidence},{type:"postcode",operator:"in",values:["7413","7416","7417"],evidence:deventerEvidence}]}]};
const deventer=(postcode,wozValue)=>buildAddressContext({postcode,huisnummer:1,straatnaam:"Teststraat",gemeentenaam:"Deventer",gemeentecode:"0150"},{municipalityCode:"GM0150",municipalityName:"Deventer",wozValue});
assert.equal(evaluateGeographicScope(deventerScope,deventer("7411",470000),"GM0150").status,"match");
assert.equal(evaluateGeographicScope(deventerScope,deventer("7417",600000),"GM0150").status,"match");
assert.equal(evaluateGeographicScope(deventerScope,deventer("7411",600000),"GM0150").status,"no-match");
console.log("PASS address context: canonical address identity and geographic scopes");