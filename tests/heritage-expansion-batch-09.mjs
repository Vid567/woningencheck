import fs from 'node:fs';

const batch = JSON.parse(fs.readFileSync('data/heritage-expansion-batch-09.json','utf8'));
const municipalities = batch.municipalities;

if (municipalities.length !== 30) throw new Error(`Expected 30 municipalities, got ${municipalities.length}`);

const codes = new Set();
for (const municipality of municipalities) {
  if (!/^GM\d{4}$/.test(municipality.code)) throw new Error(`Invalid CBS code: ${municipality.code}`);
  if (codes.has(municipality.code)) throw new Error(`Duplicate code: ${municipality.code}`);
  codes.add(municipality.code);
  if (!municipality.name || !municipality.status || !municipality.localSource) {
    throw new Error(`Missing required fields for ${municipality.code}`);
  }
  if (!['verified','discovery-required'].includes(municipality.status)) {
    throw new Error(`Invalid status for ${municipality.code}`);
  }
}

console.log(`heritage-expansion-batch-09 PASS (${municipalities.length} municipalities)`);
