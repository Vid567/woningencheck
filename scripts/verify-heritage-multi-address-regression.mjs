#!/usr/bin/env node
import fs from 'node:fs';

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

console.log(`HERITAGE_MULTI_ADDRESS records=${multi.length} sampled=${sample.length} checkedAddresses=${checkedAddresses}`);
for (const record of sample.slice(0, 10)) {
  console.log(`SAMPLE monument=${record.monumentNumber} addresses=${new Set(record.addresses.map(norm).filter(Boolean)).size}`);
}

if (errors.length) {
  console.error(`HERITAGE_MULTI_ADDRESS_ERRORS=${errors.length}`);
  for (const error of errors.slice(0, 100)) console.error(`ERROR ${error}`);
  process.exit(1);
}

console.log('HERITAGE_MULTI_ADDRESS_REGRESSION=PASS');
