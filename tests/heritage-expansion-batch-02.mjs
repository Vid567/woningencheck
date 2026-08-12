import assert from 'node:assert/strict';
import fs from 'node:fs';
const batch=JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-02.json',import.meta.url)));
assert.equal(batch.municipalities.length,30,'batch 2 moet exact 30 gemeenten bevatten');
assert.equal(new Set(batch.municipalities.map(x=>x.code)).size,30,'gemeentecodes moeten uniek zijn');
assert.ok(batch.baseline?.url?.includes('cultureelerfgoed.nl'),'RCE-baseline ontbreekt');
for(const m of batch.municipalities){assert.match(m.code,/^GM\d{4}$/);assert.ok(m.name);assert.ok(m.localSource?.startsWith('https://'));assert.ok(['verified','discovery-required'].includes(m.status));assert.ok(m.types?.length>=2);}
const verified=batch.municipalities.filter(x=>x.status==='verified');
assert.ok(verified.length>=8,`minimaal 8 harde lokale bronnen verwacht, kreeg ${verified.length}`);
for(const m of verified)assert.ok(!/^https:\/\/[^/]+\/?$/.test(m.localSource),`${m.name}: verified mag geen kale homepage zijn`);
const rich=new Map(batch.municipalities.map(x=>[x.name,x]));
assert.ok(rich.get('Beekdaelen').types.includes('beeldbepalend-pand'));
assert.ok(rich.get('Baarn').types.includes('provinciaal-monument'));
assert.ok(rich.get('Barendrecht').types.includes('beschermd-stads-dorpsgezicht'));
console.log(`heritage expansion batch 02: PASS (${verified.length}/30 direct verified)`);
