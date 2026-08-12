import assert from 'node:assert/strict';
import {normalizeArnhemMonument,normalizeArnhemProtectedView,fetchArnhemMonuments,fetchArnhemProtectedViews} from '../scripts/heritage/adapters/arnhem.mjs';
import {resolveHeritageForAddress,heritageLegalTriggers,HERITAGE_TYPES,HERITAGE_AREA_TYPES} from '../assets/heritage.js';

const polygon={type:'Polygon',coordinates:[[[5.89,51.98],[5.93,51.98],[5.93,52.01],[5.89,52.01],[5.89,51.98]]]};

const municipal=normalizeArnhemMonument({OBJECTID:12,type:'Gemeentelijk monument',adres:'Hoflaan 4, 6824 BP Arnhem',naam:'Testmonument'});
assert.equal(municipal.heritageType,HERITAGE_TYPES.MUNICIPAL_MONUMENT);
let result=resolveHeritageForAddress({displayName:'Hoflaan 4, 6824 BP Arnhem',municipalityCode:'GM0202'},[municipal]);
assert.equal(result.protectedObject,true);
assert.deepEqual(heritageLegalTriggers(result,'gevel verbouwen'),['object-erfgoedtoets']);

const national=normalizeArnhemMonument({OBJECTID:13,type:'Rijksmonument',adres:'Rijksstraat 1, 6811 AA Arnhem'});
assert.equal(national.heritageType,HERITAGE_TYPES.NATIONAL_MONUMENT);

const view=normalizeArnhemProtectedView({OBJECTID:21,type:'Rijksbeschermd stadsgezicht',naam:'Arnhem beschermd',geometry:polygon});
assert.equal(view.areaType,HERITAGE_AREA_TYPES.NATIONAL_PROTECTED_VIEW);
result=resolveHeritageForAddress({longitude:5.91,latitude:51.99,municipalityCode:'GM0202'},[view]);
assert.equal(result.protectedArea,true);
assert.equal(result.protectedObject,false);
assert.deepEqual(heritageLegalTriggers(result,'dakkapel bouwen'),['gebied-erfgoedtoets']);

result=resolveHeritageForAddress({displayName:'Hoflaan 4, 6824 BP Arnhem',longitude:5.91,latitude:51.99,municipalityCode:'GM0202'},[municipal,view]);
assert.equal(result.protectedObject,true);
assert.equal(result.protectedArea,true);
assert.deepEqual(heritageLegalTriggers(result,'gevel verbouwen').sort(),['gebied-erfgoedtoets','object-erfgoedtoets']);

result=resolveHeritageForAddress({displayName:'Andere straat 9, 6824 BP Arnhem',longitude:5.95,latitude:52.03,municipalityCode:'GM0202'},[municipal,view]);
assert.equal(result.hasHeritageTrigger,false);
assert.equal(result.matches,0);

const fakeFetch=async url=>({ok:true,json:async()=>url.includes('/12/query')?{features:[{type:'Feature',properties:{OBJECTID:31,type:'Gemeentelijk monument',adres:'Testweg 1, 6811 AA Arnhem'},geometry:null}]}:{features:[{type:'Feature',properties:{OBJECTID:32,type:'Rijksbeschermd stadsgezicht',naam:'Testgebied'},geometry:polygon}]}});
assert.equal((await fetchArnhemMonuments(fakeFetch)).length,1);
assert.equal((await fetchArnhemProtectedViews(fakeFetch)).length,1);

console.log('Arnhem heritage adapter regression: PASS');
