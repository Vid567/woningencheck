#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const taxonomy=JSON.parse(await fs.readFile(path.join(ROOT,'data/heritage-object-types.json'),'utf8'));
const typeById=new Map(taxonomy.objectTypes.map(x=>[x.id,x]));
const patterns=taxonomy.objectTypes.flatMap(t=>[t.id,...(t.aliases||[])].filter(Boolean).map(term=>({type:t.id,term:String(term).toLowerCase()}))).sort((a,b)=>b.term.length-a.term.length);

const norm=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);

export function classifyHeritageObject(record={}){
  const explicit=arr(record.objectTypes?.length?record.objectTypes:record.objectType).filter(x=>typeById.has(x));
  if(explicit.length)return {objectTypes:[...new Set(explicit)],method:'source-explicit',confidence:'high'};
  const fields=[record.type,record.functie,record.oorspronkelijkeFunctie,record.name,record.naam,record.omschrijving,record.description,record.raw?.type,record.raw?.functie,record.raw?.oorspronkelijke_functie,record.raw?.omschrijving].filter(Boolean).map(norm);
  const hits=[];
  for(const p of patterns){const needle=norm(p.term);if(needle&&fields.some(f=>new RegExp(`(^| )${needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}( |$)`).test(f)))hits.push(p.type)}
  return {objectTypes:[...new Set(hits)],method:hits.length?'official-text-classification':'unclassified',confidence:hits.length?'high':null};
}

export function enrich(record){const c=classifyHeritageObject(record);return {...record,objectType:c.objectTypes[0]||null,objectTypes:c.objectTypes,objectTypeClassification:{method:c.method,confidence:c.confidence,taxonomyVersion:taxonomy.version}}}

if(import.meta.url===`file://${process.argv[1]}`){
  const input=process.argv[2],output=process.argv[3];
  if(!input||!output){console.error('usage: node scripts/heritage-object-classifier.mjs input.json output.json');process.exit(2)}
  const data=JSON.parse(await fs.readFile(input,'utf8'));
  const records=Array.isArray(data)?data:(data.records||data.features||[]);
  const enriched=records.map(enrich);
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),taxonomyVersion:taxonomy.version,records:enriched},null,2)+'\n');
  const classified=enriched.filter(r=>r.objectTypes.length).length;
  console.log(`HERITAGE_OBJECT_CLASSIFICATION total=${enriched.length} classified=${classified} unclassified=${enriched.length-classified}`);
}
