import assert from "node:assert/strict";
import fs from "node:fs";
import {evaluateGeographicScope} from "../assets/geography.js";
const stripBOM = s => s && s[0] === '\uFEFF' ? s.slice(1) : s;
const readJson = path => JSON.parse(stripBOM(fs.readFileSync(path,'utf8')));
const ev=[{municipalityCode:"GM0001",url:"https://example.overheid.nl/regeling",section:"Bijlage 1"}],ctx={municipality:{code:"GM0001"},address:{postcode:"1234AB",street:"Marktstraat",houseNumber:12},location:{districtCode:"WK000101",neighborhoodCode:"BU00010101",municipalAreaName:"Centrum",longitude:1,latitude:1},property:{wozValue:300000,usePurpose:"residential"}};
const one=c=>evaluateGeographicScope({operator:"AND",conditions:[{...c,evidence:ev}]},ctx,"GM0001").status;
assert.equal(one({type:"municipality",operator:"equals",value:"GM0001"}),"match");
assert.equal(one({type:"postcode-list",operator:"in",values:["1234AB"]}),"match");
assert.equal(one({type:"street-list",operator:"in",values:["Marktstraat"]}),"match");
assert.equal(one({type:"address-range",street:"Marktstraat",from:2,to:20,parity:"even"}),"match");
assert.equal(one({type:"address-list",street:"Marktstraat",values:[{number:12,addition:""}]}),"match");
assert.equal(one({type:"cbs-district",operator:"equals",value:"WK000101"}),"match");
assert.equal(one({type:"cbs-neighbourhood",operator:"equals",value:"BU00010101"}),"match");
assert.equal(one({type:"polygon",geometry:{type:"Polygon",coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]}}),"match");
assert.equal(one({type:"property-value",operator:"lte",value:350000}),"match");
assert.equal(one({type:"official-map",machineReadable:false}),"manual-review-required");
const and={operator:"AND",conditions:[{type:"municipality",operator:"equals",value:"GM0001",evidence:ev},{type:"postcode",operator:"equals",value:"9999ZZ",evidence:ev}]};assert.equal(evaluateGeographicScope(and,ctx,"GM0001").status,"no-match");
const or={operator:"OR",conditions:[...and.conditions]};assert.equal(evaluateGeographicScope(or,ctx,"GM0001").status,"match");
assert.equal(evaluateGeographicScope({operator:"AND",conditions:[{type:"municipality",operator:"equals",value:"GM0001",evidence:[]}]},ctx,"GM0001").status,"manual-review-required");
assert.equal(evaluateGeographicScope({operator:"AND",conditions:[{type:"postcode-list",operator:"in",values:["1234AB"],evidence:[{municipalityCode:"GM9999",url:"https://example.overheid.nl"}]}]},ctx,"GM0001").status,"manual-review-required");
const records = readJson("data/regulations.json").records;for(const r of records.filter(x=>x.geographicScope)){const raw=JSON.stringify(r.geographicScope);assert(raw.includes(r.municipalityCode),r.id+" geography lacks municipality-specific evidence");}console.log("PASS geography: municipality, postcode, street, range, district, neighbourhood, polygon, AND/OR, property, unknown map and cross-municipality evidence");

const almelo = readJson('data/batch-001-geographic-scopes.json').scopes[0].scope;
const a=(street,houseNumber,houseNumberAddition='')=>evaluateGeographicScope(almelo,{municipality:{code:'GM0141'},address:{street,houseNumber,houseNumberAddition}},'GM0141').status;
assert.equal(a('Grotestraat',80),'match');assert.equal(a('Bornsestraat',80),'no-match');assert.equal(a('Boddenstraat',53,'a'),'match');assert.equal(a('Boddenstraat',53),'no-match');assert.equal(a('Wierdensestraat',2),'match');assert.equal(a('Wierdensestraat',2,'a'),'match');assert.equal(a('Wierdensestraat',2,'b'),'no-match');


