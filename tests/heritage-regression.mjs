import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveHeritageForAddress,heritageLegalTriggers,HERITAGE_TYPES,HERITAGE_AREA_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../assets/heritage.js';

let passed=0,failed=0;
function test(name,fn){try{fn();console.log(`PASS  ${name}`);passed++}catch(e){console.error(`FAIL  ${name}\n      ${e.message}`);failed++}}
const sources=JSON.parse(fs.readFileSync(new URL('../data/heritage-sources.json',import.meta.url),'utf8'));

test('source registry bevat RCE-baselaag',()=>assert.ok(sources.sources.some(x=>x.id==='rce-rijksmonumentenregister')));
test('source registry bevat vijf A-gemeenten',()=>{for(const code of ['GM0363','GM0344','GM0772','GM0202','GM0153'])assert.ok(sources.sources.some(x=>x.scope===code),code)});
test('object- en gebiedsstatus zijn expliciet gescheiden',()=>assert.equal(sources.principles.objectAndAreaStatusSeparated,true));

test('BAG-match vindt gemeentelijk monument en activeert verbouwtoets',()=>{
  const r=resolveHeritageForAddress({municipalityCode:'GM0200',bagPandId:'P1'},[{sourceId:'test',heritageType:HERITAGE_TYPES.MUNICIPAL_MONUMENT,bagPandIds:['P1'],matchMethod:MATCH_METHODS.BAG,officialUrl:'https://example.invalid'}]);
  assert.equal(r.objectStatuses.length,1);assert.equal(r.areaStatuses.length,0);assert.equal(r.protectedObject,true);assert.deepEqual(heritageLegalTriggers(r,'kozijnen verbouwen'),['object-erfgoedtoets']);
});

test('beschermd gezicht maakt pand niet zelf tot monument',()=>{
  const polygon={type:'Polygon',coordinates:[[[4,51],[6,51],[6,53],[4,53],[4,51]]]};
  const r=resolveHeritageForAddress({municipalityCode:'GM0363',longitude:5,latitude:52},[{sourceId:'test-area',areaType:HERITAGE_AREA_TYPES.NATIONAL_PROTECTED_VIEW,geometry:polygon,matchMethod:MATCH_METHODS.GEOMETRY}]);
  assert.equal(r.objectStatuses.length,0);assert.equal(r.areaStatuses.length,1);assert.equal(r.protectedObject,false);assert.equal(r.protectedArea,true);assert.deepEqual(heritageLegalTriggers(r,'dakkapel bouwen'),['gebied-erfgoedtoets']);
});

test('voorbescherming activeert bescherming',()=>{
  const r=resolveHeritageForAddress({displayName:'Teststraat 1, Eindhoven'},[{sourceId:'eindhoven',heritageType:HERITAGE_TYPES.MUNICIPAL_MONUMENT,designationStatus:DESIGNATION_STATUS.PREPROTECTED,addresses:['Teststraat 1, Eindhoven'],matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.protectedObject,true);
});

test('alleen in onderzoek activeert geen beschermingsconclusie',()=>{
  const r=resolveHeritageForAddress({displayName:'Teststraat 2, Eindhoven'},[{sourceId:'eindhoven',heritageType:HERITAGE_TYPES.CULTURAL_HISTORIC,designationStatus:DESIGNATION_STATUS.UNDER_REVIEW,addresses:['Teststraat 2, Eindhoven'],matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.objectStatuses.length,1);assert.equal(r.protectedObject,false);assert.equal(r.hasHeritageTrigger,false);
});

test('negatieve adrescontrole geeft geen false positive',()=>{
  const r=resolveHeritageForAddress({displayName:'Andere straat 99, Utrecht'},[{sourceId:'utrecht',heritageType:HERITAGE_TYPES.IMAGE_DEFINING,addresses:['Voorbeeldstraat 1, Utrecht'],matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.matches,0);assert.equal(r.hasHeritageTrigger,false);
});

test('RCE kort adres matcht PDOK volledig adres via sterke identiteit',()=>{
  const r=resolveHeritageForAddress({municipalityCode:'GM0363',street:'Dam',houseNumber:37,postcode:'1012DA',displayName:'Dam 37, 1012 DA Amsterdam'},[{sourceId:'rce',municipalityCode:'GM0363',heritageType:HERITAGE_TYPES.NATIONAL_MONUMENT,addresses:['Dam 37'],addressIdentity:{street:'Dam',houseNumber:'37',addition:'',postcode:'1012DA'},matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.protectedObject,true);assert.equal(r.matches,1);
});

test('huisnummertoevoeging 23-H, 23 H en 23H is canoniek gelijk',()=>{
  const record={sourceId:'rce',municipalityCode:'GM0363',heritageType:HERITAGE_TYPES.NATIONAL_MONUMENT,addresses:['Teststraat 23-H'],addressIdentity:{street:'Teststraat',houseNumber:'23',addition:'H',postcode:'1012AB'},matchMethod:MATCH_METHODS.ADDRESS};
  for(const addition of ['H','-H',' H'])assert.equal(resolveHeritageForAddress({municipalityCode:'GM0363',street:'Teststraat',houseNumber:23,houseNumberAddition:addition,postcode:'1012 AB'},[record]).matches,1);
});

test('zelfde huisnummer en postcode maar andere straat matcht niet',()=>{
  const r=resolveHeritageForAddress({municipalityCode:'GM0363',street:'Andere Straat',houseNumber:37,postcode:'1012DA'},[{sourceId:'rce',municipalityCode:'GM0363',heritageType:HERITAGE_TYPES.NATIONAL_MONUMENT,addresses:['Dam 37'],addressIdentity:{street:'Dam',houseNumber:'37',addition:'',postcode:'1012DA'},matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.matches,0);
});

test('zelfde straat en nummer maar andere postcode matcht niet bij sterke identiteit',()=>{
  const r=resolveHeritageForAddress({municipalityCode:'GM0363',street:'Dam',houseNumber:37,postcode:'9999ZZ'},[{sourceId:'rce',municipalityCode:'GM0363',heritageType:HERITAGE_TYPES.NATIONAL_MONUMENT,addresses:['Dam 37'],addressIdentity:{street:'Dam',houseNumber:'37',addition:'',postcode:'1012DA'},matchMethod:MATCH_METHODS.ADDRESS}]);
  assert.equal(r.matches,0);
});

console.log(`\nHERITAGE RESULTAAT: ${passed} PASS · ${failed} FAIL`);if(failed)process.exit(1);
