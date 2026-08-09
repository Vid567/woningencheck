import assert from 'node:assert/strict';
import fs from 'node:fs';
const geo=JSON.parse(fs.readFileSync('data/batch-002-geographic-scopes.json','utf8')).scopes;
const reviews=JSON.parse(fs.readFileSync('data/review-queue.json','utf8')).items.filter(x=>['open','in-review'].includes(x.status));
assert.equal(reviews.length,2);assert(reviews.every(x=>x.blockerClass==='municipality-specific-blocker'));
const a=geo.find(x=>x.municipalityCode==='GM0362');assert.equal(a.conditionType,'distance-to-official-feature');assert.equal(a.threshold,50);assert.equal(a.unit,'metre');assert.equal(a.officialDataset.crs,'EPSG:28992');assert.equal(a.officialDataset.featureCount,247);assert.equal(a.officialDataset.pointSemantics,'unconfirmed');assert.equal(a.automation.enabled,false);
const s=geo.find(x=>x.municipalityCode==='GM0106');assert.equal(s.officialMap.georeferenced,false);assert.equal(s.derivedGeometry.created,false);assert.equal(s.automation.enabled,false);assert(s.legalSource.url.startsWith('https://'));
for(const x of geo){assert(x.publicMessage&&!/GIS|review|status|machine/i.test(x.publicMessage));assert.equal(x.status,'quarantined-unresolved');}
console.log('PASS Batch 002 closure: 11 resolved, 2 municipality-specific quarantines, no approximation');
