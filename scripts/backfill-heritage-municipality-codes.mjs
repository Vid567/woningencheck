#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import readline from 'node:readline';

const inputPath = process.argv[2] || 'data/heritage-object-records.json';
const reportPath = 'data/heritage-object-import-report.json';
const tmpPath = `${inputPath}.municipality-backfill.tmp`;
const concurrency = Math.max(1, Math.min(16, Number(process.env.PDOK_BACKFILL_CONCURRENCY || 8)));
const retries = Math.max(1, Math.min(5, Number(process.env.PDOK_BACKFILL_RETRIES || 3)));
const timeoutMs = Math.max(3000, Math.min(30000, Number(process.env.PDOK_BACKFILL_TIMEOUT_MS || 12000)));
const municipalities = JSON.parse(await fs.readFile('data/municipalities-2026.json', 'utf8')).municipalities;
const validCodes = new Set(municipalities.map(m => m.code));

function normalizeMunicipalityCode(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (/^GM\d{4}$/.test(raw) && validCodes.has(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const code = `GM${digits.slice(-4).padStart(4, '0')}`;
  return validCodes.has(code) ? code : null;
}

function lookupAddress(record) {
  const addresses = Array.isArray(record.addresses) ? record.addresses.filter(Boolean) : [];
  if (!addresses.length) return null;
  return String(addresses[0]).trim() || null;
}

async function lookupPdokMunicipality(record) {
  const query = lookupAddress(record);
  if (!query) return null;
  const url = new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/free');
  url.searchParams.set('q', query);
  url.searchParams.set('fq', 'type:adres');
  url.searchParams.set('rows', '1');

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'woningencheck-heritage-backfill/1.0' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const doc = data?.response?.docs?.[0];
      const code = normalizeMunicipalityCode(doc?.gemeentecode || doc?.gemeente_code || doc?.gemeenteCode);
      if (code) return code;
      return null;
    } catch (error) {
      if (attempt === retries) return null;
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

let attempted = 0;
let resolved = 0;
let unresolved = 0;
let recordsSeen = 0;
let withMunicipalityBefore = 0;
let withMunicipalityAfter = 0;
let firstRecord = true;
let inRecords = false;
let afterRecords = false;
let batch = [];
const suffixLines = [];
const writer = createWriteStream(tmpPath, { encoding: 'utf8' });
const write = async text => { if (!writer.write(text)) await once(writer, 'drain'); };

async function processRecord(record) {
  recordsSeen++;
  const existing = normalizeMunicipalityCode(record.municipalityCode);
  if (existing) {
    record.municipalityCode = existing;
    withMunicipalityBefore++;
    withMunicipalityAfter++;
    return record;
  }

  attempted++;
  const code = await lookupPdokMunicipality(record);
  if (code) {
    record.municipalityCode = code;
    record.municipalityMatchMethod = 'pdok_address_backfill';
    record.municipalityBackfilledAt = new Date().toISOString().slice(0, 10);
    resolved++;
    withMunicipalityAfter++;
  } else {
    unresolved++;
  }
  return record;
}

async function flushBatch() {
  if (!batch.length) return;
  const output = await Promise.all(batch.map(processRecord));
  for (const record of output) {
    await write(`${firstRecord ? '' : ',\n'}${JSON.stringify(record)}`);
    firstRecord = false;
  }
  batch = [];
  if (attempted && attempted % 200 < concurrency) {
    console.log(`PDOK_BACKFILL progress attempted=${attempted} resolved=${resolved} unresolved=${unresolved}`);
  }
}

const input = createReadStream(inputPath, { encoding: 'utf8' });
const lines = readline.createInterface({ input, crlfDelay: Infinity });
for await (const line of lines) {
  if (!inRecords) {
    await write(`${line}\n`);
    if (line.includes('"records"') && line.includes('[')) inRecords = true;
    continue;
  }

  if (!afterRecords) {
    if (line.trim() === '],') {
      await flushBatch();
      await write('\n  ],\n');
      afterRecords = true;
      continue;
    }
    const raw = line.trim().replace(/^,/, '');
    if (!raw) continue;
    batch.push(JSON.parse(raw));
    if (batch.length >= concurrency) await flushBatch();
    continue;
  }

  suffixLines.push(line);
}
await flushBatch();

const suffix = suffixLines.join('\n');
const statusMarker = suffix.indexOf('"status"');
if (statusMarker < 0) throw new Error('heritage database status block ontbreekt');
const colon = suffix.indexOf(':', statusMarker);
let statusText = suffix.slice(colon + 1).trim();
if (statusText.endsWith('}')) statusText = statusText.slice(0, -1).trim();
const status = JSON.parse(statusText);
status.municipalityCodeCount = withMunicipalityAfter;
status.municipalityBackfill = {
  method: 'pdok_address_backfill',
  attempted,
  resolved,
  unresolved,
  source: 'PDOK Locatieserver'
};
await write(`  "status": ${JSON.stringify(status, null, 2).replace(/^/gm, '  ').trimStart()}\n}\n`);
writer.end();
await once(writer, 'close');
await fs.rename(tmpPath, inputPath);

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
report.withMunicipalityBeforeBackfill = report.withMunicipality;
report.withMunicipality = withMunicipalityAfter;
report.municipalityBackfill = {
  method: 'pdok_address_backfill',
  source: 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free',
  attempted,
  resolved,
  unresolved,
  concurrency,
  retries,
  timeoutMs
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`HERITAGE_MUNICIPALITY_BACKFILL_PASS records=${recordsSeen} before=${withMunicipalityBefore} attempted=${attempted} resolved=${resolved} unresolved=${unresolved} after=${withMunicipalityAfter}`);
