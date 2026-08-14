import fs from "node:fs";

const sources = JSON.parse(fs.readFileSync("data/sources.json", "utf8")).sources;
const rules = JSON.parse(fs.readFileSync("data/regulations.json", "utf8")).records;

const hostOf = url => new URL(url).hostname.replace(/^www\./, "");

// Trust is derived from all curated URLs already registered in production data:
// source pages, official application routes and application documents. This keeps
// trust coupled to the maintained dataset instead of a separate domain allowlist.
const registeredHosts = new Set([
  ...sources.map(source => source.url),
  ...rules.flatMap(rule => [
    rule.officialApplicationUrl,
    ...(rule.applicationDocuments || []).map(document => document.url)
  ])
].filter(Boolean).map(hostOf));

const infrastructureHosts = new Set([
  "cbs.nl",
  "overheid.nl",
  "officiele-overheidspublicaties.nl",
  "repository.officiele-overheidspublicaties.nl",
  "pdok.nl"
]);

const trustedDomains = [...registeredHosts, ...infrastructureHosts];
const isTrustedHost = host => trustedDomains.some(domain =>
  host === domain || host.endsWith(`.${domain}`)
);

const targets = [
  ...sources.map(source => ({ id: source.id, url: source.url, type: "source" })),
  ...rules.flatMap(rule => [
    { id: rule.id, url: rule.officialApplicationUrl, type: "application" },
    ...(rule.applicationDocuments || []).map((document, index) => ({
      id: `${rule.id}-document-${index + 1}`,
      url: document.url,
      type: "document"
    }))
  ])
].filter(target => target.url);

let failed = false;
for (const target of targets) {
  const host = hostOf(target.url);
  if (!isTrustedHost(host)) {
    console.error(`UNTRUSTED ${target.type} ${target.id}: ${host}`);
    failed = true;
    continue;
  }

  try {
    const response = await fetch(target.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "Woningencheck-source-verifier/1.3" }
    });

    if (response.ok) {
      console.log(`LIVE ${target.type} ${target.id}`);
    } else if (response.status === 403) {
      console.warn(`CI-BLOCKED-403 ${target.type} ${target.id}`);
    } else {
      console.error(`HTTP ${response.status} ${target.type} ${target.id}`);
      failed = true;
    }
  } catch (error) {
    console.error(`ERROR ${target.type} ${target.id}: ${error.message}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
