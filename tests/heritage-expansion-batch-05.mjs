"use strict";
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const batch=read('../data/heritage-expansion-batch-05.json');
const master=read('../data/municipalities-2026.json');
const previous=[1,2,3,4].map(n=>read(`../data/heritage-expansion-batch-0${n}.json`));
assert.equal(batch.municipalities.length,30);
const codes=batch.municipalities.map(x=>x.code);assert.equal(new Set(codes).size,30);
const masterByCode=new Map(master.municipalities.map(x=>[x.code,x.name]));
for(const m of batch.municipalities){assert.equal(masterByCode.get(m.code),m.name,`${m.code}/${m.name}: CBS 2026 mismatch`);}
const old=new Set(previous.flatMap(b=>b.municipalities.map(x=>x.code)));for(const c of codes)assert.ok(!old.has(c),`overlap ${c}`);
for(const m of batch.municipalities){assert.match(m.code,/^GM\d{4}$/);assert.ok(m.localSource.startsWith('https://'));assert.ok(m.types.length>0);assert.ok(['verified','discovery-required'].includes(m.status));if(m.status==='verified'){assert.ok(!/^https:\/\/[^/]+\/?$/.test(m.localSource),`${m.name}: verified mag geen generieke homepage zijn`);assert.ok(m.note,`${m.name}: verified vereist notitie`);}}
const verified=batch.municipalities.filter(x=>x.status==='verified');assert.ok(verified.length>=10,`verwacht >=10 verified, kreeg ${verified.length}`);
const hellendoorn=batch.municipalities.find(x=>x.name==='Hellendoorn');assert.ok(hellendoorn.types.includes('voorbescherming'));
const hillegom=batch.municipalities.find(x=>x.name==='Hillegom');assert.ok(hillegom.types.includes('karakteristiek-pand'));assert.ok(hillegom.types.includes('gemeentelijk-beschermd-stads-dorpsgezicht'));
const hogeland=batch.municipalities.find(x=>x.name==='Het Hogeland');assert.ok(hogeland.types.includes('karakteristiek-pand'));assert.ok(hogeland.types.includes('archeologisch-waardegebied'));
const heemskerk=batch.municipalities.find(x=>x.name==='Heemskerk');assert.ok(heemskerk.types.includes('provinciaal-monument'));
console.log(`heritage expansion batch 05: PASS (${verified.length} verified / 30)`);
