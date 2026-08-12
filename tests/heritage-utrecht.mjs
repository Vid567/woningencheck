import assert from 'node:assert/strict';
import {normalizeUtrechtImageDefining,normalizeUtrechtMonument,normalizeUtrechtProtectedView} from '../scripts/heritage/adapters/utrecht.mjs';
import {resolveHeritageForAddress,heritageLegalTriggers,HERITAGE_TYPES,HERITAGE_AREA_TYPES} from '../assets/heritage.js';

const image=normalizeUtrechtImageDefining({PK_ID:42,OPENBARERUIMTENAAM:'Voorbeeldstraat',HUISNUMMER:10,POSTCODE:'3511 AA',LOCATIE:'Voorbeeldstraat 10'});
assert.equal(image.heritageType,HERITAGE_TYPES.IMAGE_DEFINING);
assert.equal(image.addresses[0],'Voorbeeldstraat, 10, 3511AA');
let result=resolveHeritageForAddress({displayName:'Voorbeeldstraat, 10, 3511AA'},[image]);
assert.equal(result.objectStatuses.length,1);
assert.equal(result.objectStatuses[0].type,HERITAGE_TYPES.IMAGE_DEFINING);
assert.equal(result.areaStatuses.length,0);

const monument=normalizeUtrechtMonument({PK_ID:43,MONUMENTTYPE:'Gemeentelijk monument',OPENBARERUIMTENAAM:'Oudegracht',HUISNUMMER:100,POSTCODE:'3511 AV'});
assert.equal(monument.heritageType,HERITAGE_TYPES.MUNICIPAL_MONUMENT);
result=resolveHeritageForAddress({displayName:'Oudegracht, 100, 3511AV'},[monument]);
assert.equal(result.protectedObject,true);
assert.ok(heritageLegalTriggers(result,'gevel verbouwen').includes('object-erfgoedtoets'));

const view=normalizeUtrechtProtectedView({PK_ID:44,TYPE:'Rijksbeschermd',NAAM:'Binnenstad',geometry:{type:'Polygon',coordinates:[[[5.0,52.0],[5.2,52.0],[5.2,52.2],[5.0,52.2],[5.0,52.0]]]}});
assert.equal(view.areaType,HERITAGE_AREA_TYPES.NATIONAL_PROTECTED_VIEW);
result=resolveHeritageForAddress({longitude:5.1,latitude:52.1},[view]);
assert.equal(result.protectedObject,false);
assert.equal(result.protectedArea,true);
assert.ok(heritageLegalTriggers(result,'dakkapel bouwen').includes('gebied-erfgoedtoets'));

result=resolveHeritageForAddress({displayName:'Andere straat, 1, 3511AA'},[image,monument]);
assert.equal(result.matches,0,'ander adres mag geen Utrechtse objectstatus erven');

console.log('Utrecht heritage adapter: PASS');
