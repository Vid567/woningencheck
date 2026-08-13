#!/usr/bin/env node
import fs from 'node:fs';
import { resolveHeritageForAddress, heritageLegalTriggers, HERITAGE_TYPES } from '../assets/heritage.js';

const db = JSON.parse(fs.readFileSync('data/heritage-object-records.json', 'utf8'));
const records = db.records || [];
const norm = value => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const multi = records.filter(record => Array.isArray(record.addresses) && new Set(record.addresses.map(norm).filter(Boolean)).size >= 2);
if (!multi.length) {
  console.error('HERITAGE_MULTI_ADDRESS_REGRESSION=FAIL no multi-address records found');
  process.exit(1);
}

const addressIndex = new Map();
for (const record of records) {
  for (const address of new Set((record.addresses || []).map(norm).filter(Boolean))) {
    const existing = addressIndex.get(address) || [];
    existing.push(record);
    addressIndex.set(address, existing);
  }
}

const sample = multi
  .sort((a, b) => b.addresses.length - a.addresses.length || String(a.monumentNumber).localeCompare(String(b.monumentNumber)))
  .slice(0, 50);

let checkedAddresses = 0;
const errors = [];
for (const record of sample) {
  const normalized = [...new Set(record.addresses.map(norm).filter(Boolean))];
  if (normalized.length < 2) errors.push(`${record.monumentNumber}: expected >=2 distinct addresses`);
  for (const address of normalized) {
    checkedAddresses++;
    const matches = addressIndex.get(address) || [];
    if (!matches.some(match => match.sourceRecordId === record.sourceRecordId)) {
      errors.push(`${record.monumentNumber}: address did not resolve back to same object: ${address}`);
    }
  }
}

const negative = '__woningencheck_nonexistent_address_987654321__';
if ((addressIndex.get(norm(negative)) || []).length) errors.push('negative control unexpectedly matched');

const duplicateAddressRecords = sample.filter(record => {
  const raw = (record.addresses || []).filter(Boolean);
  return raw.length !== new Set(raw.map(norm)).size;
});
if (duplicateAddressRecords.length) {
  for (const record of duplicateAddressRecords) errors.push(`${record.monumentNumber}: duplicate normalized addresses retained`);
}

// End-to-end resolver gate against real records from the freshly imported RCE dataset.
// Select one address-backed rijksmonument from at least 10 distinct municipalities.
const byMunicipality = new Map();
for (const record of records) {
  if (!record.municipalityCode || !record.addresses?.length || record.matchMethod !== 'address_exact') continue;
  if (!byMunicipality.has(record.municipalityCode)) byMunicipality.set(record.municipalityCode, record);
}
const municipalitySample = [...byMunicipality.entries()].slice(0, 12);
if (municipalitySample.length < 10) errors.push(`resolver E2E has only ${municipalitySample.length} municipalities; expected >=10`);

let resolverPositive = 0;
let resolverNegative = 0;
let legalTriggerPositive = 0;
for (const [municipalityCode, record] of municipalitySample) {
  const address = record.addresses[0];
  const result = resolveHeritageForAddress({ displayName: address, municipalityCode }, [record]);
  if (!result.protectedObject || result.matches !== 1) {
    errors.push(`${record.monumentNumber}: resolver failed exact RCE address ${address}`);
  } else {
    resolverPositive++;
  }
  if (result.objectStatuses[0]?.type !== HERITAGE_TYPES.NATIONAL_MONUMENT) {
    errors.push(`${record.monumentNumber}: resolver did not return rijksmonument status`);
  }
  if (!result.objectStatuses[0]?.officialUrl?.includes(String(record.monumentNumber))) {
    errors.push(`${record.monumentNumber}: official RCE URL missing from resolver output`);
  }
  const triggers = heritageLegalTriggers(result, 'verbouwing van gevel en dak');
  if (!triggers.includes('object-erfgoedtoets')) {
    errors.push(`${record.monumentNumber}: heritage legal trigger did not propagate`);
  } else {
    legalTriggerPositive++;
  }

  const falseAddress = `${address} __geen_monument_match__`;
  const negativeResult = resolveHeritageForAddress({ displayName: falseAddress, municipalityCode }, [record]);
  if (negativeResult.matches !== 0 || negativeResult.protectedObject) {
    errors.push(`${record.monumentNumber}: mutated address produced false positive`);
  } else {
    resolverNegative++;
  }
}

// Explicitly exercise several real multi-address records through the production resolver.
let multiResolverAddresses = 0;
for (const record of sample.slice(0, 10)) {
  for (const address of [...new Set(record.addresses)].slice(0, 20)) {
    const result = resolveHeritageForAddress({ displayName: address, municipalityCode: record.municipalityCode }, [record]);
    if (!result.protectedObject || result.matches !== 1 || result.objectStatuses[0]?.monumentNumber !== String(record.monumentNumber)) {
      errors.push(`${record.monumentNumber}: multi-address resolver failed for ${address}`);
    }
    multiResolverAddresses++;
  }
}

console.log(`HERITAGE_MULTI_ADDRESS records=${multi.length} sampled=${sample.length} checkedAddresses=${checkedAddresses}`);
for (const record of sample.slice(0, 10)) {
  console.log(`SAMPLE monument=${record.monumentNumber} addresses=${new Set(record.addresses.map(norm).filter(Boolean)).size}`);
}
console.log(`HERITAGE_RESOLVER_E2E municipalities=${municipalitySample.length} positive=${resolverPositive} negative=${resolverNegative} legalTriggers=${legalTriggerPositive} multiAddresses=${multiResolverAddresses}`);

if (errors.length) {
  console.error(`HERITAGE_MULTI_ADDRESS_ERRORS=${errors.length}`);
  for (const error of errors.slice(0, 100)) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('HERITAGE_MULTI_ADDRESS_REGRESSION=PASS');
console.log('HERITAGE_ADDRESS_RESOLVER_E2E=PASS');
