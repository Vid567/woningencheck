import fs from "node:fs";

const sources = JSON.parse(fs.readFileSync("data/sources.json", "utf8")).sources;
const rules = JSON.parse(fs.readFileSync("data/regulations.json", "utf8")).records;

// Trust is derived from the curated source registry plus the small set of
// national infrastructure domains used directly by the runtime. This avoids
// maintaining a second, incomplete municipality-domain allowlist here.
const registryHosts = new Set(
  sources
    .map(source => source.url)
    .filter(Boolean)
    .map(url => new URL(url).hostname.replace(/^www\./, ""))
);
const infrastructureHosts = new Set([
  "cbs.nl",
  "overheid.nl",
  "officiele-overheidspublicaties.nl",
  "repository.officiele-overheidspublicaties.nl",
  "pdok.nl"
]);

const isTrustedHost = host =>
  [...registryHosts, ...infrastructureHosts].some(domain =>
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
  const host = new URL(target.url).hostname.replace(/^www\./, "");
  if (!isTrustedHost(host)) {
    console.error(`UNTRUSTED ${target.type} ${target.id}: ${host}`);
    failed = true;
    continue;
  }

  try {
    const response = await fetch(target.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "Woningencheck-source-verifier/1.2" }
    });

    if (response.ok) {
      console.log(`LIVE ${target.type} ${target.id}`);
    } else if (response.status === 403) {
      // A number of official sites reject GitHub-hosted/bot traffic while
      // remaining reachable for normal browsers. Keep this visible without
      // turning that anti-bot response into a false broken-source failure.
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
