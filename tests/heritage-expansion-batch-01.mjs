"use strict";
import assert from 'node:assert/strict';
import fs from 'node:fs';
const batch=JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-01.json',import.meta.url)));
assert.equal(batch.municipalities.length,30,'batch must contain 30 municipalities');
assert.equal(new Set(batch.municipalities.map(x=>x.code)).size,30,'municipality codes must be unique');
for(const m of batch.municipalities){
  assert.match(m.code,/^GM\d{4}$/);
  assert.ok(m.name);
  assert.ok(m.family);
  assert.ok(/^https:\/\//.test(m.localSource),`${m.name}: official local source missing`);
  assert.ok(['verified','discovery-required'].includes(m.status),`${m.name}: invalid status`);
  assert.ok(Array.isArray(m.types)&&m.types.length>0,`${m.name}: heritage types missing`);
}
const verified=batch.municipalities.filter(x=>x.status==='verified').length;
const discovery=batch.municipalities.filter(x=>x.status==='discovery-required').length;
assert.equal(verified+discovery,30);
assert.ok(verified>=10,'at least ten municipalities must have a specifically verified local heritage source before batch acceptance');
assert.ok(batch.baseline?.url?.includes('cultureelerfgoed.nl'),'RCE baseline missing');
console.log(`heritage expansion batch 01: PASS (30 municipalities; ${verified} verified, ${discovery} discovery queue)`);
