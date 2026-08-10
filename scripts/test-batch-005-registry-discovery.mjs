import fs from 'node:fs';
const R = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const b = R('data/research-batches/batch-005-registry-discovery.json');
const s = R('data/research-status.json');
const registry = R('data/source-registry/bronregister-342.json');
const fail = (m) => { throw new Error(m); };
if (b.records.length !== 25) fail('Expected 25 municipalities');
if (new Set(b.records.map((r) => r.municipalityCode)).size !== 25) fail('Duplicate municipality');
if (b.registry.selectedRegistryHits !== 25) fail('Registry coverage incomplete');
if (registry.municipalityCount !== 342) fail('Unexpected registry size');
if (b.publicRulesCreated !== 0 || !b.safety.discoveryIsNotLegalVerification) fail('Safety gate violated');
if (b.performance.maxConcurrency > 5) fail('Concurrency exceeded');
for (const r of b.records) {
  if (!r.registrySourceCount) fail(`No registry sources for ${r.municipalityName}`);
  if (!r.sourceCandidates.length) fail(`No candidates for ${r.municipalityName}`);
  if (r.negativeLegalConclusion || r.publicOutputCreated) fail(`Unsafe conclusion for ${r.municipalityName}`);
  if (!['structured-verification','deep-verification-needed'].includes(r.verificationRoute)) fail(`Invalid route for ${r.municipalityName}`);
  const st = s.records.find((x) => x.municipalityCode === r.municipalityCode);
  if (!st || st.discoveryBatch !== 'batch-005-registry-discovery' || st.discoveryStatus !== 'discovery-complete') fail(`Research status not updated for ${r.municipalityName}`);
}
console.log('Batch005 registry discovery QA passed');
