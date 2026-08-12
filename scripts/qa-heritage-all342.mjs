import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const baseline = readJson('data/municipalities-2026.json');
const baselineMunicipalities = baseline.municipalities || [];
const baselineByCode = new Map(baselineMunicipalities.map(m => [m.code, m]));

const batchFiles = Array.from({ length: 9 }, (_, i) => `data/heritage-expansion-batch-${String(i + 1).padStart(2, '0')}.json`);
const rows = [];
const batchSummary = [];

for (const file of batchFiles) {
  const data = readJson(file);
  const municipalities = data.municipalities || [];
  batchSummary.push({
    file,
    batchId: data.batchId || null,
    records: municipalities.length,
    verified: municipalities.filter(x => x.status === 'verified').length,
    discoveryRequired: municipalities.filter(x => x.status === 'discovery-required').length,
  });
  for (const m of municipalities) rows.push({ ...m, batch: file });
}

const occurrences = new Map();
for (const row of rows) {
  if (!occurrences.has(row.code)) occurrences.set(row.code, []);
  occurrences.get(row.code).push(row);
}

const uniqueCodes = [...occurrences.keys()];
const duplicates = [...occurrences.entries()]
  .filter(([, items]) => items.length > 1)
  .map(([code, items]) => ({
    code,
    baselineName: baselineByCode.get(code)?.name || null,
    count: items.length,
    occurrences: items.map(x => ({ batch: x.batch, name: x.name, status: x.status }))
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

const missing = baselineMunicipalities
  .filter(m => !occurrences.has(m.code))
  .map(m => ({ code: m.code, name: m.name, province: m.provinceName }))
  .sort((a, b) => a.name.localeCompare(b.name, 'nl'));

const invalidCodes = uniqueCodes
  .filter(code => !baselineByCode.has(code))
  .map(code => ({ code, occurrences: occurrences.get(code).map(x => ({ batch: x.batch, name: x.name, status: x.status })) }))
  .sort((a, b) => a.code.localeCompare(b.code));

const nameMismatches = rows
  .filter(row => baselineByCode.has(row.code) && baselineByCode.get(row.code).name !== row.name)
  .map(row => ({
    code: row.code,
    baselineName: baselineByCode.get(row.code).name,
    batchName: row.name,
    batch: row.batch,
    status: row.status,
  }));

const uniqueBaselineRows = uniqueCodes.filter(code => baselineByCode.has(code));
const statusByCode = {};
for (const code of uniqueBaselineRows) {
  const items = occurrences.get(code);
  statusByCode[code] = {
    code,
    name: baselineByCode.get(code).name,
    statuses: [...new Set(items.map(x => x.status))],
    batches: items.map(x => x.batch),
  };
}

const fullyVerifiedUnique = Object.values(statusByCode).filter(x => x.statuses.includes('verified')).length;
const discoveryOnlyUnique = Object.values(statusByCode).filter(x => !x.statuses.includes('verified') && x.statuses.includes('discovery-required')).length;

const report = {
  generatedAt: new Date().toISOString(),
  baseline: {
    file: 'data/municipalities-2026.json',
    referenceDate: baseline.referenceDate,
    municipalityCountDeclared: baseline.municipalityCount,
    municipalityCountActual: baselineMunicipalities.length,
  },
  heritageBatches: batchSummary,
  totals: {
    rawBatchRecords: rows.length,
    uniqueBatchCodes: uniqueCodes.length,
    uniqueCodesMatchingBaseline: uniqueBaselineRows.length,
    duplicateCodeCount: duplicates.length,
    missingBaselineMunicipalities: missing.length,
    invalidOrNonBaselineCodes: invalidCodes.length,
    nameMismatchCount: nameMismatches.length,
    uniqueMunicipalitiesWithAtLeastOneVerifiedRecord: fullyVerifiedUnique,
    uniqueMunicipalitiesDiscoveryOnly: discoveryOnlyUnique,
    uniqueMunicipalitiesCoveredPercent: Number(((uniqueBaselineRows.length / baselineMunicipalities.length) * 100).toFixed(2)),
    uniqueMunicipalitiesVerifiedPercent: Number(((fullyVerifiedUnique / baselineMunicipalities.length) * 100).toFixed(2)),
  },
  duplicates,
  missing,
  invalidCodes,
  nameMismatches,
};

fs.mkdirSync(path.join(root, 'reports/heritage'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/heritage/all342-coverage-qa.json'), JSON.stringify(report, null, 2) + '\n');

const md = [];
md.push('# Heritage all-342 coverage QA');
md.push('');
md.push(`Generated: ${report.generatedAt}`);
md.push(`Baseline: ${report.baseline.municipalityCountActual} municipalities (${report.baseline.referenceDate})`);
md.push('');
md.push('## Summary');
md.push('');
md.push(`- Raw batch records: ${report.totals.rawBatchRecords}`);
md.push(`- Unique municipality codes in batches: ${report.totals.uniqueBatchCodes}`);
md.push(`- Unique baseline municipalities covered: ${report.totals.uniqueCodesMatchingBaseline}/${report.baseline.municipalityCountActual} (${report.totals.uniqueMunicipalitiesCoveredPercent}%)`);
md.push(`- Missing baseline municipalities: ${report.totals.missingBaselineMunicipalities}`);
md.push(`- Duplicate municipality codes across batches: ${report.totals.duplicateCodeCount}`);
md.push(`- Non-baseline/invalid codes: ${report.totals.invalidOrNonBaselineCodes}`);
md.push(`- Code/name mismatches: ${report.totals.nameMismatchCount}`);
md.push(`- Unique municipalities with at least one verified record: ${report.totals.uniqueMunicipalitiesWithAtLeastOneVerifiedRecord}/${report.baseline.municipalityCountActual} (${report.totals.uniqueMunicipalitiesVerifiedPercent}%)`);
md.push(`- Unique municipalities discovery-only: ${report.totals.uniqueMunicipalitiesDiscoveryOnly}`);
md.push('');
md.push('## Per batch');
md.push('');
for (const b of batchSummary) md.push(`- ${b.batchId}: ${b.records} records; ${b.verified} verified; ${b.discoveryRequired} discovery-required`);
md.push('');
md.push('## Missing municipalities');
md.push('');
if (missing.length === 0) md.push('- None');
else for (const m of missing) md.push(`- ${m.code} — ${m.name} (${m.province})`);
md.push('');
md.push('## Duplicate codes');
md.push('');
if (duplicates.length === 0) md.push('- None');
else for (const d of duplicates) md.push(`- ${d.code} — ${d.baselineName || 'not in baseline'} — ${d.count} occurrences: ${d.occurrences.map(x => `${path.basename(x.batch)} [${x.status}]`).join(', ')}`);
md.push('');
md.push('## Code/name mismatches');
md.push('');
if (nameMismatches.length === 0) md.push('- None');
else for (const x of nameMismatches) md.push(`- ${x.code}: baseline “${x.baselineName}”, batch “${x.batchName}” in ${path.basename(x.batch)}`);
md.push('');
md.push('## Non-baseline codes');
md.push('');
if (invalidCodes.length === 0) md.push('- None');
else for (const x of invalidCodes) md.push(`- ${x.code}: ${x.occurrences.map(o => `${o.name} (${path.basename(o.batch)})`).join(', ')}`);
md.push('');

fs.writeFileSync(path.join(root, 'reports/heritage/all342-coverage-qa.md'), md.join('\n') + '\n');

console.log(JSON.stringify(report.totals, null, 2));
