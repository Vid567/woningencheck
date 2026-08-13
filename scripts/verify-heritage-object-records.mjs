#!/usr/bin/env node
import fs from 'node:fs';
const db=JSON.parse(fs.readFileSync('data/heritage-object-records.json','utf8'));
const taxonomy=JSON.parse(fs.readFileSync('data/heritage-object-types.json','utf8'));
const allowed=new Set(taxonomy.objectTypes.map(x=>x.id));
const records=db.records||[],errors=[];
if(records.length<50000)errors.push(`recordCount ${records.length} < 50000`);
if(db.status?.nationwideObjectImportPending!==false)errors.push('nationwideObjectImportPending is not false');
const ids=new Set();let classified=0,addressed=0;
for(const r of records){if(!r.sourceId)errors.push('record missing sourceId');if(!r.sourceRecordId)errors.push('record missing sourceRecordId');const key=`${r.sourceId}:${r.sourceRecordId}`;if(ids.has(key))errors.push(`duplicate ${key}`);ids.add(key);if(r.heritageType!=='rijksmonument')errors.push(`${key}: unexpected heritageType ${r.heritageType}`);if(!Array.isArray(r.objectTypes))errors.push(`${key}: objectTypes missing`);else {for(const t of r.objectTypes)if(!allowed.has(t))errors.push(`${key}: invalid objectType ${t}`);if(r.objectTypes.length)classified++}if(Array.isArray(r.addresses)&&r.addresses.length)addressed++;if(!/^https:\/\//.test(r.officialUrl||''))errors.push(`${key}: officialUrl missing/non-https`)}
console.log(`HERITAGE_OBJECTS total=${records.length} unique=${ids.size} classified=${classified} addressed=${addressed}`);
if(errors.length){console.error(`HERITAGE_OBJECT_IMPORT_ERRORS=${errors.length}`);for(const e of errors.slice(0,100))console.error('ERROR '+e);process.exit(1)}
console.log('HERITAGE_OBJECT_IMPORT=PASS');
