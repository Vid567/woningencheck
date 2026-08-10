import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJson = async (p, v) => fs.writeFile(p, JSON.stringify(v, null, 2) + '\n');
const UA = 'WoningencheckResearchBot/1.0 (+https://woningencheck.nl)';

const status = await readJson('data/research-status.json');
const registry = await readJson('data/source-registry/bronregister-342.json');
const registryByCode = new Map(registry.records.map((r) => [r.municipalityCode, r]));
const selected = status.records.filter((r) => r.researchStatus === 'not-started' && r.discoveryStatus !== 'discovery-complete').slice(0, 25);
if (selected.length !== 25) throw new Error(`Expected 25 untouched municipalities, found ${selected.length}`);

let active = 0;
let maxConcurrency = 0;
let networkRequests = 0;
let errors = 0;
const pool = async (items, limit, fn) => {
  let next = 0;
  const out = [];
  await Promise.all(Array.from({ length: limit }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
};

const checkUrl = async (source) => {
  active++;
  maxConcurrency = Math.max(maxConcurrency, active);
  networkRequests++;
  const started = performance.now();
  try {
    const response = await fetch(source.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': UA }
    });
    await response.arrayBuffer();
    return {
      url: source.url,
      sourceClass: source.sourceClass,
      official: source.official === true,
      status: response.status,
      reachable: response.ok,
      finalUrl: response.url,
      durationMs: Math.round(performance.now() - started)
    };
  } catch (e) {
    errors++;
    return {
      url: source.url,
      sourceClass: source.sourceClass,
      official: source.official === true,
      status: 'error',
      reachable: false,
      error: String(e),
      durationMs: Math.round(performance.now() - started)
    };
  } finally {
    active--;
  }
};

const runMunicipality = async (row, index) => {
  const started = performance.now();
  const reg = registryByCode.get(row.municipalityCode);
  if (!reg) throw new Error(`No registry record for ${row.municipalityCode} ${row.municipalityName}`);
  const officialSources = (reg.sources || []).filter((s) => s.official === true && s.url);
  if (!officialSources.length) throw new Error(`No official source in registry for ${row.municipalityName}`);

  const priority = { regulation: 0, application: 1, gis: 2, 'municipal-site': 3 };
  const sourcesToCheck = [...officialSources].sort((a, b) => (priority[a.sourceClass] ?? 9) - (priority[b.sourceClass] ?? 9)).slice(0, 4);
  const liveChecks = await pool(sourcesToCheck, Math.min(2, sourcesToCheck.length), checkUrl);
  const substantiveSources = officialSources.filter((s) => s.sourceClass !== 'municipal-site');
  const reachableSubstantive = liveChecks.filter((c) => c.reachable && c.sourceClass !== 'municipal-site');
  const route = substantiveSources.length ? 'structured-verification' : 'deep-verification-needed';

  return {
    queuePosition: index + 1,
    municipalityCode: row.municipalityCode,
    municipalityName: row.municipalityName,
    province: row.province,
    registryStatus: reg.status,
    registrySourceCount: officialSources.length,
    candidatePermitTypes: reg.candidatePermitTypes || [],
    discoveryStatus: 'discovery-complete',
    researchStatus: 'not-started',
    verificationRoute: route,
    sourceCandidates: officialSources.map((s) => ({ url: s.url, sourceClass: s.sourceClass, descriptors: s.descriptors || [] })),
    liveChecks,
    reachableSubstantiveCount: reachableSubstantive.length,
    publicOutputCreated: false,
    negativeLegalConclusion: false,
    durationMs: Math.round(performance.now() - started)
  };
};

const startedAt = new Date().toISOString();
const t0 = performance.now();
const records = await pool(selected, 5, runMunicipality);
const durationMs = Math.round(performance.now() - t0);
const structured = records.filter((r) => r.verificationRoute === 'structured-verification');
const deep = records.filter((r) => r.verificationRoute === 'deep-verification-needed');

const output = {
  schemaVersion: '1.0.0',
  batchId: 'batch-005-registry-discovery',
  generatedAt: new Date().toISOString(),
  startedAt,
  registry: {
    path: 'data/source-registry/bronregister-342.json',
    generatedAt: registry.generatedAt,
    municipalityCount: registry.municipalityCount,
    selectedRegistryHits: records.length
  },
  selection: { count: 25, untouchedOnly: true, municipality26Processed: false },
  records,
  triage: {
    structuredVerification: structured.map((r) => r.municipalityCode),
    deepVerificationNeeded: deep.map((r) => r.municipalityCode)
  },
  findings: [],
  verifiedFindings: [],
  publicRulesCreated: 0,
  safety: {
    discoveryIsNotLegalVerification: true,
    negativeLegalConclusions: 0,
    publicRulesCreated: 0,
    boundedConcurrency: 5,
    sourceRegistryRequired: true
  },
  performance: { durationMs, networkRequests, errors, maxConcurrency },
  finalRecommendation: 'CONTINUE REGISTRY-BACKED DISCOVERY; SEND STRUCTURED CASES TO VERIFICATION AND PARK DEEP CASES SEPARATELY'
};

await fs.mkdir('data/research-batches', { recursive: true });
await writeJson('data/research-batches/batch-005-registry-discovery.json', output);
for (const row of status.records) {
  const result = records.find((r) => r.municipalityCode === row.municipalityCode);
  if (!result) continue;
  Object.assign(row, {
    discoveryStatus: 'discovery-complete',
    discoveryTier: result.verificationRoute === 'structured-verification' ? 2 : 4,
    verificationRoute: result.verificationRoute,
    discoveryBatch: 'batch-005-registry-discovery',
    discoveryCheckedAt: new Date().toISOString().slice(0, 10)
  });
}
await writeJson('data/research-status.json', status);

const rows = records.map((r) => `| ${r.municipalityName} | ${r.registrySourceCount} | ${r.liveChecks.filter((x) => x.reachable).length}/${r.liveChecks.length} | ${r.verificationRoute} |`).join('\n');
const report = `# Batch 005 — Registry-backed accelerated discovery\n\nDeze batch gebruikt rechtstreeks het definitieve landelijke bronregister. Discovery is nog geen juridische verificatie en er zijn geen publieke regels aangemaakt.\n\n| Gemeente | Officiële bronnen | Live bereikbaar | Route |\n| --- | ---: | ---: | --- |\n${rows}\n\n## Triage\n\n- Structurele verificatie: ${structured.length}\n- Diepe juridische/GIS-verificatie: ${deep.length}\n- Gemeenten zonder bronregister-hit: 0\n- Publieke regels aangemaakt: 0\n\n## Prestatie\n\nDuur: ${durationMs} ms; netwerkverzoeken: ${networkRequests}; errors: ${errors}; maximale concurrency: ${maxConcurrency}.\n\n## Besluit\n\n**CONTINUE REGISTRY-BACKED DISCOVERY.** Eenvoudige gevallen gaan door naar structurele verificatie; complexere juridische/GIS-gevallen blijven apart voor diepere controle.\n`;
await fs.mkdir('docs/research-batches', { recursive: true });
await fs.writeFile('docs/research-batches/batch-005-registry-discovery.md', report);
console.log(JSON.stringify(output.performance));
