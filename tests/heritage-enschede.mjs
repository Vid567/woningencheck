import assert from 'node:assert/strict';
import {resolveHeritageForAddress,heritageLegalTriggers,HERITAGE_TYPES,HERITAGE_AREA_TYPES} from '../assets/heritage.js';
import {normalizeEnschedeMonument,normalizeEnschedeArchaeology} from '../scripts/heritage/adapters/enschede.mjs';

let passed=0;
const test=(name,fn)=>{try{fn();passed++;console.log(`PASS ${name}`)}catch(e){console.error(`FAIL ${name}`);throw e}};
const square={type:'Polygon',coordinates:[[[6.88,52.21],[6.91,52.21],[6.91,52.23],[6.88,52.23],[6.88,52.21]]]};

test('gemeentelijk monument blijft objectstatus',()=>{
  const r=normalizeEnschedeMonument({OBJECTID:1,type:'Gemeentelijk monument',straatnaam:'Marktstraat',huisnummer:1,postcode:'7511AA'});
  assert.equal(r.heritageType,HERITAGE_TYPES.MUNICIPAL_MONUMENT);
  const hit=resolveHeritageForAddress({displayName:'Marktstraat, 1, 7511AA'},[r]);
  assert.equal(hit.protectedObject,true);assert.equal(hit.protectedArea,false);
});

test('rijksmonument wordt apart geclassificeerd',()=>{
  const r=normalizeEnschedeMonument({OBJECTID:2,type:'Rijksmonument',adres:'Oude Markt, 1, 7511GA'});
  assert.equal(r.heritageType,HERITAGE_TYPES.NATIONAL_MONUMENT);
});

test('archeologische beleidszone is alleen gebiedsstatus',()=>{
  const r=normalizeEnschedeArchaeology({OBJECTID:3,categorie:'Archeologisch onderzoeksgebied',geometry:square});
  assert.equal(r.areaType,HERITAGE_AREA_TYPES.ARCHAEOLOGICAL);
  const hit=resolveHeritageForAddress({longitude:6.895,latitude:52.22},[r]);
  assert.equal(hit.protectedObject,false);assert.equal(hit.protectedArea,true);
});

test('archeologie maakt pand niet tot monument',()=>{
  const r=normalizeEnschedeArchaeology({OBJECTID:4,zone:'Archeologische zone',geometry:square});
  const hit=resolveHeritageForAddress({longitude:6.895,latitude:52.22},[r]);
  assert.equal(hit.objectStatuses.length,0);assert.equal(hit.areaStatuses.length,1);
});

test('monument triggert erfgoedtoets bij verbouwen',()=>{
  const r=normalizeEnschedeMonument({OBJECTID:5,type:'Gemeentelijk monument',adres:'Teststraat, 10, 7500AA'});
  const hit=resolveHeritageForAddress({displayName:'Teststraat, 10, 7500AA'},[r]);
  assert.deepEqual(heritageLegalTriggers(hit,'verbouwen'),['object-erfgoedtoets']);
});

test('ander adres geeft geen false positive',()=>{
  const r=normalizeEnschedeMonument({OBJECTID:6,type:'Gemeentelijk monument',adres:'Monumentstraat, 1, 7500AA'});
  const hit=resolveHeritageForAddress({displayName:'Andere straat, 9, 7500BB'},[r]);
  assert.equal(hit.hasHeritageTrigger,false);assert.equal(hit.matches,0);
});

console.log(`Enschede heritage adapter: ${passed}/6 tests PASS`);
