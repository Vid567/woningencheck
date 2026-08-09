import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const batch=read('data/research-batches/batch-001.json');
const status=read('data/research-status.json');
const taxonomy=new Set(read('data/permit-taxonomy.json').permitTypes.map(x=>x.canonicalType));
const expected=['GM1680','GM0358','GM0197','GM0059','GM0482','GM0613','GM0361','GM0141','GM0034','GM0484'];
assert.deepEqual(batch.municipalities.map(x=>x.municipalityCode),expected,'batch selection/order changed');
assert.equal(batch.municipalities.length,10);
assert.equal(status.records.length,342);
assert.equal(new Set(status.records.map(x=>x.municipalityCode)).size,342);
const changed=status.records.filter(x=>x.researchStartedAt==='2026-08-09'&&expected.includes(x.municipalityCode));
assert.equal(changed.length,10,'not exactly ten batch status records');
for(const m of batch.municipalities){assert.equal(m.addressTests[0].officialMunicipalityCode,m.municipalityCode); assert.equal(m.addressTests[0].result,'municipality-code-match');}
for(const f of batch.findings){assert.match(f.municipalityCode,/^GM\d{4}$/); assert.ok(f.officialRegulationUrl.startsWith('https://')); assert.ok(f.officialRegulationUrl.includes('.overheid.nl/')); for(const t of f.canonicalTypes) assert.ok(taxonomy.has(t),`unknown taxonomy ${t}`); assert.equal(f.officialApplicationUrl,null,'unverified application CTA must remain absent');}
const html=fs.readFileSync('index.html','utf8')+fs.readFileSync('assets/app.js','utf8');
for(const internal of ['manual-gis-review-required','same-as-info-verified','automated recheck pending']) assert.ok(!html.includes(internal),`internal status leaked: ${internal}`);
assert.equal(fs.readFileSync('CNAME','utf8').trim(),'woningencheck.nl');
console.log(`batch-001 ok: ${batch.municipalities.length} municipalities, ${batch.findings.length} research findings, 0 unverified CTAs`);
