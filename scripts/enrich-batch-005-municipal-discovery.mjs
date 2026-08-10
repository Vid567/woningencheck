import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));
const writeJson = async (p, v) => fs.writeFile(p, JSON.stringify(v, null, 2) + '\n');
const batch = await readJson('data/research-batches/batch-005-registry-discovery.json');
const status = await readJson('data/research-status.json');
const UA = 'WoningencheckResearchBot/1.0 (+https://woningencheck.nl)';
const keywords = ['huisvest','verhuur','kamerverhuur','opkoop','splits','onttrekk','leegstand','vakantieverhuur','short-stay','shortstay','woonruimte','woningdelen','woningvorming'];
let requests = 0, errors = 0, active = 0, maxConcurrency = 0;

const fetchText = async (url) => {
  requests++; active++; maxConcurrency = Math.max(maxConcurrency, active);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': UA } });
    const text = await r.text();
    return { ok: r.ok, status: r.status, url: r.url, text };
  } catch (e) {
    errors++;
    return { ok: false, status: 'error', url, text: '', error: String(e) };
  } finally { active--; }
};

const extractLocs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => m[1].replaceAll('&amp;', '&'));
const extractLinks = (html, base) => {
  const out = [];
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try { out.push(new URL(m[1], base).href); } catch {}
  }
  return out;
};
const relevant = (u) => keywords.some((k) => decodeURIComponent(u).toLowerCase().includes(k));
const sameHost = (u, base) => { try { return new URL(u).hostname.replace(/^www\./,'') === new URL(base).hostname.replace(/^www\./,''); } catch { return false; } };

const discover = async (record) => {
  const started = performance.now();
  const municipal = record.sourceCandidates.find((s) => s.sourceClass === 'municipal-site');
  if (!municipal) return { municipalityCode: record.municipalityCode, municipalityName: record.municipalityName, candidates: [], route: 'deep-verification-needed', reason: 'no-municipal-site', durationMs: 0 };
  const base = municipal.url;
  const seen = new Set();
  const candidates = new Set();
  const add = (urls) => urls.forEach((u) => { if (sameHost(u, base) && relevant(u)) candidates.add(u); });

  const home = await fetchText(base);
  if (home.ok) add(extractLinks(home.text, home.url));

  const robotsUrl = new URL('/robots.txt', base).href;
  const robots = await fetchText(robotsUrl);
  const sitemapUrls = [];
  if (robots.ok) for (const m of robots.text.matchAll(/^sitemap:\s*(\S+)/gim)) sitemapUrls.push(m[1]);
  sitemapUrls.push(new URL('/sitemap.xml', base).href, new URL('/sitemap_index.xml', base).href);

  for (const sm of [...new Set(sitemapUrls)].slice(0, 3)) {
    if (seen.has(sm)) continue; seen.add(sm);
    const res = await fetchText(sm);
    if (!res.ok) continue;
    const locs = extractLocs(res.text);
    add(locs);
    const nested = locs.filter((u) => /sitemap/i.test(u)).slice(0, 3);
    for (const child of nested) {
      if (seen.has(child)) continue; seen.add(child);
      const cr = await fetchText(child);
      if (cr.ok) add(extractLocs(cr.text));
    }
  }

  const candidateList = [...candidates].slice(0, 12);
  const live = [];
  for (const url of candidateList.slice(0, 6)) {
    const r = await fetchText(url);
    live.push({ url, status: r.status, reachable: r.ok, finalUrl: r.url });
  }
  const reachable = live.filter((x) => x.reachable).map((x) => x.finalUrl || x.url);
  return {
    municipalityCode: record.municipalityCode,
    municipalityName: record.municipalityName,
    municipalSite: base,
    candidates: candidateList,
    reachableCandidates: reachable,
    route: reachable.length ? 'structured-verification' : 'deep-verification-needed',
    durationMs: Math.round(performance.now() - started)
  };
};

const results = [];
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (true) {
    const i = next++;
    if (i >= batch.records.length) return;
    results[i] = await discover(batch.records[i]);
  }
}));

for (const r of results) {
  const st = status.records.find((x) => x.municipalityCode === r.municipalityCode);
  if (st && r.route === 'structured-verification') {
    st.verificationRoute = 'structured-verification';
    st.discoveryTier = 2;
  }
}
await writeJson('data/research-status.json', status);

const structured = results.filter((r) => r.route === 'structured-verification');
const output = {
  schemaVersion: '1.0.0',
  batchId: 'batch-005-registry-enrichment',
  generatedAt: new Date().toISOString(),
  sourceBatch: 'batch-005-registry-discovery',
  records: results,
  triage: { structuredVerification: structured.map((r) => r.municipalityCode), deepVerificationNeeded: results.filter((r) => r.route !== 'structured-verification').map((r) => r.municipalityCode) },
  safety: { discoveryIsNotLegalVerification: true, publicRulesCreated: 0, negativeLegalConclusions: 0 },
  performance: { networkRequests: requests, errors, maxConcurrency }
};
await writeJson('data/research-batches/batch-005-registry-enrichment.json', output);
const rows = results.map((r) => `| ${r.municipalityName} | ${r.candidates.length} | ${r.reachableCandidates.length} | ${r.route} |`).join('\n');
const report = `# Batch 005 — gemeentelijke bronverrijking\n\nDe officiële gemeentelijke websites uit het landelijke bronregister zijn aanvullend onderzocht via homepage-links, robots.txt en sitemaps. Dit is discovery, geen juridische conclusie.\n\n| Gemeente | Kandidaten | Live bereikbaar | Route |\n| --- | ---: | ---: | --- |\n${rows}\n\n## Uitkomst\n\n- Naar structurele verificatie: ${structured.length}\n- Diepe verificatie nodig: ${results.length - structured.length}\n- Netwerkverzoeken: ${requests}\n- Errors: ${errors}\n- Maximale concurrency: ${maxConcurrency}\n- Publieke regels aangemaakt: 0\n`;
await fs.writeFile('docs/research-batches/batch-005-registry-enrichment.md', report);
console.log(JSON.stringify(output.performance));
