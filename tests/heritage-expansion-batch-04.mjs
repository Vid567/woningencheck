"use strict";
import assert from 'node:assert/strict';
import fs from 'node:fs';
const batch=JSON.parse(fs.readFileSync(new URL('../data/heritage-expansion-batch-04.json',import.meta.url),'utf8'));
const previous=['../data/heritage-expansion-batch-01.json','../data/heritage-expansion-batch-02.json','../data/heritage-expansion-batch-03.json'].map(p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8')));
assert.equal(batch.municipalities.length,30);
const codes=batch.municipalities.map(x=>x.code);assert.equal(new Set(codes).size,30);
const old=new Set(previous.flatMap(b=>b.municipalities.map(x=>x.code)));for(const c of codes)assert.ok(!old.has(c),`overlap ${c}`);
for(const m of batch.municipalities){assert.match(m.code,/^GM\d{4}$/);assert.ok(m.localSource.startsWith('https://'));assert.ok(m.types.length>0);assert.ok(['verified','discovery-required'].includes(m.status));if(m.status==='verified'){const host=new URL(m.localSource).hostname;assert.ok(!/^https:\/\/[^/]+\/?$/.test(m.localSource),`${m.name}: verified mag geen generieke homepage zijn`);assert.ok(host.includes('.')&&m.note,`${m.name}: verified vereist specifieke bron en notitie`);}}
const verified=batch.municipalities.filter(x=>x.status==='verified');assert.ok(verified.length>=10,`verwacht >=10 verified, kreeg ${verified.length}`);
const echt=batch.municipalities.find(x=>x.name==='Echt-Susteren');assert.ok(echt.types.includes('beeldbepalend-pand'));
const edam=batch.municipalities.find(x=>x.name==='Edam-Volendam');assert.ok(edam.types.includes('cultuurhistorische-zone'));
const fryske=batch.municipalities.find(x=>x.name==='De Fryske Marren');assert.ok(fryske.types.includes('unesco-erfgoedgebied'));
console.log(`heritage expansion batch 04: PASS (${verified.length} verified / 30)`);
