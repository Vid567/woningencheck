#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';

const input = process.argv[2] || 'data/heritage-object-records.json';
const outDir = process.argv[3] || 'data/heritage-municipalities';
await fsp.rm(outDir, { recursive: true, force: true });
await fsp.mkdir(outDir, { recursive: true });

const writers = new Map();
const counts = new Map();
const first = new Map();

function writerFor(code) {
  if (writers.has(code)) return writers.get(code);
  const writer = fs.createWriteStream(path.join(outDir, `${code}.json`), { encoding: 'utf8' });
  writer.write('{"version":1,"municipalityCode":' + JSON.stringify(code) + ',"records":[');
  writers.set(code, writer);
  counts.set(code, 0);
  first.set(code, true);
  return writer;
}

const rl = readline.createInterface({ input: fs.createReadStream(input, { encoding: 'utf8' }), crlfDelay: Infinity });
let parsed = 0;
let sharded = 0;
for await (const rawLine of rl) {
  let line = rawLine.trim();
  if (!line.startsWith('{"sourceId"')) continue;
  if (line.endsWith(',')) line = line.slice(0, -1);
  const record = JSON.parse(line);
  parsed++;
  const code = record.municipalityCode;
  if (!/^GM\d{4}$/.test(code || '')) continue;
  const compact = {
    sourceId: record.sourceId,
    sourceRecordId: record.sourceRecordId,
    monumentNumber: record.monumentNumber,
    municipalityCode: code,
    bagPandIds: record.bagPandIds || [],
    bagAddressIds: record.bagAddressIds || [],
    addresses: record.addresses || [],
    objectType: record.objectType || null,
    objectTypes: record.objectTypes || [],
    heritageType: record.heritageType,
    designationStatus: record.designationStatus,
    matchMethod: record.matchMethod,
    name: record.name || null,
    officialUrl: record.officialUrl || null,
    checkedAt: record.checkedAt || null
  };
  const writer = writerFor(code);
  writer.write((first.get(code) ? '' : ',') + JSON.stringify(compact));
  first.set(code, false);
  counts.set(code, counts.get(code) + 1);
  sharded++;
}

await Promise.all([...writers.entries()].map(([code, writer]) => new Promise((resolve, reject) => {
  writer.end(`],"recordCount":${counts.get(code)}}\n`, resolve);
  writer.on('error', reject);
})));

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: input,
  municipalityCount: writers.size,
  recordCount: sharded,
  unshardedRecordCount: parsed - sharded,
  municipalities: Object.fromEntries([...counts.entries()].sort())
};
await fsp.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
if (sharded < 60000) throw new Error(`HERITAGE_SHARDS quality gate: ${sharded} sharded records < 60000`);
console.log(`HERITAGE_MUNICIPALITY_SHARDS=PASS municipalities=${writers.size} records=${sharded} unsharded=${parsed - sharded}`);
