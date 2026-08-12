import assert from 'node:assert/strict';
import {resolveHeritageForAddress,heritageLegalTriggers,DESIGNATION_STATUS,HERITAGE_TYPES} from '../assets/heritage.js';
import {normalizeEindhovenDesignated,normalizeEindhovenPreprotected,normalizeEindhovenUnderReview} from '../scripts/heritage/adapters/eindhoven.mjs';

const designated=normalizeEindhovenDesignated({id:'EH-1',type:'Gemeentelijk monument',adres:'Testlaan 1, 5611 AA',naam:'Testmonument'});
assert.equal(designated.heritageType,HERITAGE_TYPES.MUNICIPAL_MONUMENT);
assert.equal(designated.designationStatus,DESIGNATION_STATUS.DESIGNATED);
let result=resolveHeritageForAddress({displayName:'Testlaan 1, 5611 AA'},[designated]);
assert.equal(result.protectedObject,true);
assert.deepEqual(heritageLegalTriggers(result,'verbouwen'),['object-erfgoedtoets']);

const pre=normalizeEindhovenPreprotected({id:'EH-2',type:'Cultuurhistorisch waardevol object',adres:'Voorstraat 2, 5622 BB',status:'Voorbeschermd'});
assert.equal(pre.heritageType,HERITAGE_TYPES.CULTURAL_HISTORIC);
assert.equal(pre.designationStatus,DESIGNATION_STATUS.PREPROTECTED);
result=resolveHeritageForAddress({displayName:'Voorstraat 2, 5622 BB'},[pre]);
assert.equal(result.protectedObject,true,'voorbescherming moet juridische erfgoedtrigger activeren');

const review=normalizeEindhovenUnderReview({id:'EH-3',type:'Cultuurhistorisch waardevol object',adres:'Onderzoekweg 3, 5633 CC',status:'In onderzoek'});
assert.equal(review.designationStatus,DESIGNATION_STATUS.UNDER_REVIEW);
result=resolveHeritageForAddress({displayName:'Onderzoekweg 3, 5633 CC'},[review]);
assert.equal(result.objectStatuses.length,1,'status mag informatief zichtbaar blijven');
assert.equal(result.protectedObject,false,'in onderzoek mag niet als beschermd gelden');
assert.equal(result.hasHeritageTrigger,false,'in onderzoek mag geen vergunningtrigger veroorzaken');

result=resolveHeritageForAddress({displayName:'Andereweg 99, 5655 ZZ'},[designated,pre,review]);
assert.equal(result.matches,0,'ander adres mag geen Eindhoven-erfgoedstatus krijgen');
assert.equal(result.hasHeritageTrigger,false);

const national=normalizeEindhovenDesignated({id:'EH-4',type:'Rijksmonument',adres:'Rijksweg 4, 5614 DD'});
assert.equal(national.heritageType,HERITAGE_TYPES.NATIONAL_MONUMENT);

console.log('PASS heritage-eindhoven: designated, preprotected, under-review and negative matching');
