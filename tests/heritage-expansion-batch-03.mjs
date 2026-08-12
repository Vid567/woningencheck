"use strict";
import fs from 'node:fs';
import assert from 'node:assert/strict';
const batch=JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-03.json',import.meta.url),'utf8'));
const existing=[
  JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-01.json',import.meta.url),'utf8')),
  JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-02.json',import.meta.url),'utf8'))
];
assert.equal(batch.municipalities.length,30,'batch 03 must contain exactly 30 municipalities');
const codes=batch.municipalities.map(x=>x.code), names=batch.municipalities.map(x=>x.name);
assert.equal(new Set(codes).size,30,'duplicate municipality code in batch 03');
assert.equal(new Set(names).size,30,'duplicate municipality name in batch 03');
const previous=new Set(existing.flatMap(b=>b.municipalities.map(x=>x.code)));
for(const m of batch.municipalities){
  assert.match(m.code,/^GM\d{4}$/);
  assert.ok(!previous.has(m.code),`${m.name} already occurs in expansion batch 01/02`);
  assert.ok(['verified','discovery-required'].includes(m.status));
  assert.ok(m.localSource?.startsWith('https://'),`${m.name} needs an https local source`);
  assert.ok(Array.isArray(m.types)&&m.types.length>0,`${m.name} needs heritage types`);
  if(m.status==='verified') assert.ok(!/^https:\/\/www\.[^/]+\/?$/.test(m.localSource),`${m.name} verified source may not be a bare homepage`);
}
const verified=batch.municipalities.filter(x=>x.status==='verified');
assert.ok(verified.length>=8,'batch 03 needs at least 8 specifically verified local sources');
const borger=batch.municipalities.find(x=>x.code==='GM1681');
assert.ok(!borger.types.includes('gemeentelijk-monument'),'Borger-Odoorn must not invent municipal monuments where official source says there are none');
const dronten=batch.municipalities.find(x=>x.code==='GM0303');
assert.equal(dronten.status,'discovery-required','young heritage context is not enough to claim a complete object register');
console.log(`heritage expansion batch 03: PASS (${verified.length}/30 verified, ${30-verified.length} discovery-required)`);
