import assert from 'node:assert/strict';
import {normalizeAmsterdamMonument,normalizeAmsterdamSituering,joinAmsterdamSitueringen,normalizeAmsterdamUnesco} from '../scripts/heritage/adapters/amsterdam.mjs';
import {resolveHeritageForAddress,HERITAGE_TYPES,HERITAGE_AREA_TYPES,MATCH_METHODS} from '../assets/heritage.js';
let passed=0,failed=0;function test(n,f){try{f();console.log(`PASS  ${n}`);passed++}catch(e){console.error(`FAIL  ${n}\n      ${e.message}`);failed++}}
const raw={identificatie:'M123',typeMonument:{omschrijving:'Gemeentelijk monument'},betreftBagPand:[{identificatie:'0363100012345678'}],weergavenaam:'Testmonument'};
const m=normalizeAmsterdamMonument(raw);
test('Amsterdam monument normaliseert gemeentelijke status',()=>assert.equal(m.heritageType,HERITAGE_TYPES.MUNICIPAL_MONUMENT));
test('Amsterdam monument gebruikt harde BAG-relatie',()=>{assert.equal(m.matchMethod,MATCH_METHODS.BAG);assert.deepEqual(m.bagPandIds,['0363100012345678'])});
const s=normalizeAmsterdamSituering({hoortBijMonumentenMonument:{identificatie:'M123'},betreftBagNummeraanduiding:{identificatie:'0363200012345678'},eersteSituering:'J'});
const joined=joinAmsterdamSitueringen([m],[s]);
test('situering voegt BAG-nummeraanduiding toe',()=>assert.deepEqual(joined[0].bagAddressIds,['0363200012345678']));
test('resolver vindt monument via BAG-pand',()=>{const r=resolveHeritageForAddress({bagPandId:'0363100012345678'},joined);assert.equal(r.protectedObject,true);assert.equal(r.objectStatuses[0].type,HERITAGE_TYPES.MUNICIPAL_MONUMENT)});
test('resolver vindt monument via BAG-nummeraanduiding',()=>assert.equal(resolveHeritageForAddress({bagObjectId:'0363200012345678'},joined).protectedObject,true));
test('ander BAG-object geeft geen false positive',()=>assert.equal(resolveHeritageForAddress({bagPandId:'0363100099999999'},joined).matches,0));
const u=normalizeAmsterdamUnesco({identificatie:'U1',naam:'Grachtengordel',geometrie:{type:'Polygon',coordinates:[[[4.8,52.3],[5.0,52.3],[5.0,52.4],[4.8,52.4],[4.8,52.3]]]}});
test('UNESCO blijft gebiedsstatus, geen monumentstatus',()=>{assert.equal(u.areaType,HERITAGE_AREA_TYPES.UNESCO);const r=resolveHeritageForAddress({longitude:4.9,latitude:52.35},[u]);assert.equal(r.protectedArea,true);assert.equal(r.protectedObject,false)});
console.log(`\nAMSTERDAM ERFGOED: ${passed} PASS · ${failed} FAIL`);if(failed)process.exit(1);
