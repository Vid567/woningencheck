#!/usr/bin/env node
import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { classifyHeritageObject } from './heritage-object-classifier.mjs';

const input = process.argv[2] || '.rce-extract/csv';
const today = new Date().toISOString().slice(0, 10);
const municipalities = JSON.parse(await fs.readFile('data/municipalities-2026.json', 'utf8')).municipalities;
const norm = value => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '')
  .trim();

const byName = new Map();
for (const municipality of municipalities) {
  for (const name of [municipality.name, municipality.canonicalName, ...(municipality.aliases || [])].filter(Boolean)) {
    byName.set(norm(name), municipality.code);
  }
}

const monumentIdFields = [
  'monumentnummer', 'monumentnr', 'monument nummer', 'monument_id', 'monumentid',
  'rijksmonumentnummer', 'objectnummer'
];
const objectIdFields = [
  'object_id', 'object id', 'objectid', 'id_object', 'id object', 'idobject',
  'objectidentificatie', 'object identificatie'
];
const fields = {
  names: ['naam', 'objectnaam', 'monumentnaam'],
  streets: ['straatnaam', 'straat', 'openbareruimtenaam'],
  numbers: ['huisnummer', 'huisnr', 'nummer'],
  postcodes: ['postcode'],
  places: ['woonplaatsnaam', 'woonplaats', 'plaats'],
  addresses: ['adres', 'volledigadres', 'adresregel'],
  municipalityNames: ['gemeentenaam', 'gemeente'],
  municipalityCodes: ['gemeentecode', 'gemeentecodebag', 'cbs gemeentecode'],
  types: ['type', 'objecttype', 'categorie', 'hoofdcategorie'],
  functions: ['oorspronkelijkefunctie', 'oorspronkelijke functie', 'functie', 'subcategorie'],
  descriptions: ['omschrijving', 'redengevendeomschrijving', 'redengevende omschrijving'],
  bagPandIds: ['bagpandid', 'pandidentificatie', 'pand id'],
  bagAddressIds: ['nummeraanduidingidentificatie', 'adresseerbaarobjectidentificatie', 'bagadresid']
};

const normalizedFields = Object.fromEntries(
  Object.entries(fields).map(([key, aliases]) => [key, aliases.map(norm)])
);
const normalizedMonumentIdFields = monumentIdFields.map(norm);
const normalizedObjectIdFields = objectIdFields.map(norm);

const pick = (row, aliases) => {
  for (const alias of aliases) {
    const value = row[alias];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
};

async function* csvRecords(file) {
  const stream = createReadStream(file, { encoding: 'utf8' });
  let row = [];
  let value = '';
  let quoted = false;
  let headers = null;

  const emitRow = raw => {
    if (!headers) {
      headers = raw.map(norm);
      return null;
    }
    if (!raw.some(cell => String(cell ?? '').trim())) return null;
    const record = {};
    for (let i = 0; i < headers.length; i++) record[headers[i]] = raw[i] ?? '';
    return record;
  };

  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      if (quoted) {
        if (char === '"') {
          if (chunk[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            quoted = false;
          }
        } else {
          value += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(value);
        value = '';
      } else if (char === '\n') {
        row.push(value.replace(/\r$/, ''));
        value = '';
        const record = emitRow(row);
        row = [];
        if (record) yield record;
      } else {
        value += char;
      }
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ''));
    const record = emitRow(row);
    if (record) yield record;
  }
}

const makeAggregate = (objectId, monumentNumber) => ({
  objectId,
  monumentNumber,
  tables: new Set(),
  values: Object.fromEntries(Object.keys(fields).map(key => [key, new Set()]))
});

function absorb(aggregate, row, table) {
  aggregate.tables.add(table);
  for (const [key, aliases] of Object.entries(normalizedFields)) {
    const value = pick(row, aliases);
    if (value) aggregate.values[key].add(value);
  }
}

const files = (await fs.readdir(input)).filter(file => file.toLowerCase().endsWith('.csv'));
if (!files.length) throw new Error(`Geen CSV-tabellen gevonden in ${input}`);

const objectTable = files.find(file => norm(path.basename(file, path.extname(file))) === 'tblobject');
if (!objectTable) {
  throw new Error(`Extract_MRS quality gate: tblOBJECT ontbreekt. Tabellen: ${files.join(', ')}`);
}

const byObjectId = new Map();
const byMonumentNumber = new Map();
let objectRows = 0;
let objectRowsWithoutId = 0;
let objectRowsWithoutMonument = 0;

for await (const row of csvRecords(path.join(input, objectTable))) {
  objectRows++;
  const objectId = pick(row, normalizedObjectIdFields);
  const monumentNumber = pick(row, normalizedMonumentIdFields);
  if (!objectId) {
    objectRowsWithoutId++;
    continue;
  }
  if (!/^\d+$/.test(monumentNumber)) {
    objectRowsWithoutMonument++;
    continue;
  }
  let aggregate = byObjectId.get(objectId);
  if (!aggregate) {
    aggregate = makeAggregate(objectId, monumentNumber);
    byObjectId.set(objectId, aggregate);
    byMonumentNumber.set(monumentNumber, aggregate);
  }
  absorb(aggregate, row, objectTable);
}

console.log(`TABLE ${objectTable} rows=${objectRows} objects=${byObjectId.size} noObjectId=${objectRowsWithoutId} noMonument=${objectRowsWithoutMonument}`);
if (byObjectId.size < 50000) {
  throw new Error(`Extract_MRS tblOBJECT quality gate: ${byObjectId.size} unieke objecten < 50000`);
}

let relatedRows = 0;
let joinedRows = 0;
let unjoinedRows = 0;
const tableStats = {};
for (const file of files) {
  if (file === objectTable) continue;
  let rows = 0;
  let joined = 0;
  let unjoined = 0;
  for await (const row of csvRecords(path.join(input, file))) {
    rows++;
    relatedRows++;
    const objectId = pick(row, normalizedObjectIdFields);
    const monumentNumber = pick(row, normalizedMonumentIdFields);
    const aggregate = (objectId && byObjectId.get(objectId)) || (monumentNumber && byMonumentNumber.get(monumentNumber));
    if (!aggregate) {
      unjoined++;
      unjoinedRows++;
      continue;
    }
    absorb(aggregate, row, file);
    joined++;
    joinedRows++;
  }
  tableStats[file] = { rows, joined, unjoined };
  console.log(`TABLE ${file} rows=${rows} joined=${joined} unjoined=${unjoined}`);
}

const join = set => [...set];
function buildRecord(aggregate) {
  const values = aggregate.values;
  const names = join(values.names);
  const streets = join(values.streets);
  const numbers = join(values.numbers);
  const postcodes = join(values.postcodes);
  const places = join(values.places);
  const addresses = join(values.addresses);
  if (!addresses.length && streets.length) {
    addresses.push([streets[0], numbers[0], postcodes[0], places[0]].filter(Boolean).join(' '));
  }

  const municipalityName = join(values.municipalityNames)[0] || '';
  const municipalityRawCode = join(values.municipalityCodes)[0] || '';
  const municipalityCode = /^(GM)?\d{4}$/.test(municipalityRawCode)
    ? (municipalityRawCode.startsWith('GM') ? municipalityRawCode : `GM${municipalityRawCode}`)
    : byName.get(norm(municipalityName)) || null;

  const type = join(values.types).join(' ');
  const functie = join(values.functions).join(' ');
  const omschrijving = join(values.descriptions).join(' ');
  const name = names[0] || null;
  const classification = classifyHeritageObject({ type, functie, name, omschrijving });
  const bagPandIds = join(values.bagPandIds);
  const bagAddressIds = join(values.bagAddressIds);

  return {
    sourceId: 'rce-extract-mrs',
    sourceRecordId: aggregate.monumentNumber,
    monumentNumber: aggregate.monumentNumber,
    municipalityCode,
    bagPandIds,
    bagAddressIds,
    addresses,
    objectType: classification.objectTypes[0] || null,
    objectTypes: classification.objectTypes,
    heritageType: 'rijksmonument',
    designationStatus: 'designated',
    matchMethod: bagPandIds.length || bagAddressIds.length ? 'bag_relation' : addresses.length ? 'address_exact' : 'source_assertion',
    name,
    officialUrl: `https://monumentenregister.cultureelerfgoed.nl/monumenten/${aggregate.monumentNumber}`,
    checkedAt: today,
    objectTypeClassification: {
      method: classification.method,
      confidence: classification.confidence,
      taxonomyVersion: 1
    },
    raw: {
      type,
      functie,
      omschrijving,
      extractTables: [...aggregate.tables]
    }
  };
}

const outputPath = 'data/heritage-object-records.json';
const writer = createWriteStream(outputPath, { encoding: 'utf8' });
const writeChunk = async chunk => {
  if (!writer.write(chunk)) await once(writer, 'drain');
};

await writeChunk(`{\n  "version": 3,\n  "updatedAt": ${JSON.stringify(today)},\n  "taxonomy": "data/heritage-object-types.json",\n  "sourceRegistry": "data/heritage-object-source-registry.json",\n  "records": [\n`);

let total = 0;
let classified = 0;
let addressed = 0;
let withMunicipality = 0;
const counts = {};
let first = true;

for (const aggregate of byObjectId.values()) {
  const record = buildRecord(aggregate);
  total++;
  if (record.objectTypes.length) classified++;
  if (record.addresses.length) addressed++;
  if (record.municipalityCode) withMunicipality++;
  for (const type of record.objectTypes) counts[type] = (counts[type] || 0) + 1;
  await writeChunk(`${first ? '' : ',\n'}${JSON.stringify(record)}`);
  first = false;
}

if (total < 50000) throw new Error(`Extract_MRS unique quality gate: ${total} < 50000`);

const status = {
  schemaReady: true,
  resolverReady: true,
  classifierReady: true,
  nationwideObjectImportPending: false,
  nationalRceImportComplete: true,
  municipalObjectImportCoverage: 'separate-source-adapters',
  recordCount: total,
  classifiedObjectCount: classified,
  addressCount: addressed,
  municipalityCodeCount: withMunicipality,
  note: 'Volledige landelijke Rijksmonumentenregister-import uit officiële RCE Monumentendatabank Extract_MRS.'
};

await writeChunk(`\n  ],\n  "status": ${JSON.stringify(status, null, 2).replace(/^/gm, '  ').trimStart()}\n}\n`);
writer.end();
await once(writer, 'close');

await fs.writeFile('data/heritage-object-import-report.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: 'RCE Monumentendatabank Extract_MRS',
  officialLandingPage: 'https://www.cultureelerfgoed.nl/onderwerpen/r/rijksmonumentenregister/monumentendatabank',
  objectTable,
  tables: files,
  objectRows,
  total,
  classified,
  unclassified: total - classified,
  withAddress: addressed,
  withMunicipality,
  relatedRows,
  joinedRows,
  unjoinedRows,
  tableStats,
  objectTypeCounts: counts,
  completeNationwideDump: true,
  importerMode: 'streaming-object-id-join'
}, null, 2) + '\n');

console.log(`RCE_EXTRACT_IMPORT_PASS unique=${total} classified=${classified} addressed=${addressed} municipality=${withMunicipality} relatedJoined=${joinedRows}/${relatedRows}`);
