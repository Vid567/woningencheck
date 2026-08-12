import assert from 'node:assert/strict';
import {GOLDEN15,normalizeGolden15} from '../scripts/heritage/golden15.mjs';
import {resolveHeritageForAddress} from '../assets/heritage.js';
assert.equal(GOLDEN15.length,15);
for(const c of GOLDEN15){
  const firstObject=Object.keys(c.objectTypes)[0];
  const expected=c.objectTypes[firstObject];
  const address=`Teststraat 1, ${c.name}`;
  const r=normalizeGolden15(c.name,{id:`${c.municipalityCode}-1`,type:firstObject,adres:address});
  assert.ok(r,`${c.name}: object record normaliseert`);assert.equal(r.heritageType,expected,`${c.name}: objecttype`);assert.equal(r.municipalityCode,c.municipalityCode);
  const hit=resolveHeritageForAddress({displayName:address,municipalityCode:c.municipalityCode},[r]);assert.equal(hit.objectStatuses.length,1,`${c.name}: exact adres match`);
  const miss=resolveHeritageForAddress({displayName:`Teststraat 2, ${c.name}`,municipalityCode:c.municipalityCode},[r]);assert.equal(miss.objectStatuses.length,0,`${c.name}: geen buuradres false positive`);
}
// representative area separation: Rotterdam culture-historic zone must not become object monument
const poly={type:'Polygon',coordinates:[[[4.45,51.90],[4.55,51.90],[4.55,52.00],[4.45,52.00],[4.45,51.90]]]};
const area=normalizeGolden15('Rotterdam',{id:'R-area',type:'cultuurhistorische zone',geometry:poly});assert.ok(area.areaType);assert.equal(area.heritageType,null);
const inside=resolveHeritageForAddress({municipalityCode:'GM0599',longitude:4.5,latitude:51.95},[area]);assert.equal(inside.areaStatuses.length,1);assert.equal(inside.objectStatuses.length,0);
// Groningen source incompleteness is configuration metadata, not proof of absence
assert.equal(GOLDEN15.find(x=>x.name==='Groningen').sourceCompleteness,'still-being-completed');
// Leeuwarden explicitly supports preprotection
const pre=normalizeGolden15('Leeuwarden',{id:'L-pre',type:'gemeentelijk monument',status:'voorbeschermd',adres:'Voorstraat 1, Leeuwarden'});assert.equal(pre.designationStatus,'preprotected');assert.equal(resolveHeritageForAddress({displayName:'Voorstraat 1, Leeuwarden',municipalityCode:'GM0080'},[pre]).protectedObject,true);
console.log(`heritage golden15 regression: PASS (${GOLDEN15.length} municipalities)`);
