"use strict";
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const batch=read('../data/heritage-expansion-batch-07.json');
const master=read('../data/municipalities-2026.json');
const previous=[1,2,3,4,5,6].map(n=>read(`../data/heritage-expansion-batch-0${n}.json`));
assert.equal(batch.municipalities.length,30);
const codes=batch.municipalities.map(x=>x.code);assert.equal(new Set(codes).size,30);
const masterByCode=new Map(master.municipalities.map(x=>[x.code,x.name]));
for(const m of batch.municipalities)assert.equal(masterByCode.get(m.code),m.name,`${m.code}/${m.name}: CBS 2026 mismatch`);
const old=new Set(previous.flatMap(b=>b.municipalities.map(x=>x.code)));for(const c of codes)assert.ok(!old.has(c),`overlap ${c}`);
for(const m of batch.municipalities){assert.match(m.code,/^GM\d{4}$/);assert.ok(m.localSource.startsWith('https://'));assert.ok(m.types.length>0);assert.ok(['verified','discovery-required'].includes(m.status));if(m.status==='verified'){assert.ok(!/^https:\/\/[^/]+\/?$/.test(m.localSource),`${m.name}: verified mag geen generieke homepage zijn`);assert.ok(m.note,`${m.name}: verified vereist notitie`);}}
const verified=batch.municipalities.filter(x=>x.status==='verified');assert.ok(verified.length>=10,`verwacht >=10 verified, kreeg ${verified.length}`);
const noordwijk=batch.municipalities.find(x=>x.name==='Noordwijk');assert.ok(noordwijk.types.includes('karakteristiek-pand'));assert.ok(noordwijk.types.includes('beeldbepalend-pand'));
const nunspeet=batch.municipalities.find(x=>x.name==='Nunspeet');assert.ok(!nunspeet.types.includes('beschermd-stads-dorpsgezicht'),'ingetrokken beschermd gezicht Elspeet mag niet als actief worden opgenomen');
const rheden=batch.municipalities.find(x=>x.name==='Rheden');assert.ok(rheden.types.includes('archeologisch-waardegebied'));
const rijssen=batch.municipalities.find(x=>x.name==='Rijssen-Holten');assert.ok(rijssen.types.includes('karakteristiek-pand'));assert.ok(rijssen.types.includes('cultuurhistorisch-waardevol'));
console.log(`heritage expansion batch 07: PASS (${verified.length} verified / 30)`);
