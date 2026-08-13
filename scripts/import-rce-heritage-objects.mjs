#!/usr/bin/env node
import fs from 'node:fs/promises';
import {classifyHeritageObject} from './heritage-object-classifier.mjs';

const API='https://api.linkeddata.cultureelerfgoed.nl/queries/rce/rest-api-rijksmonumenten/run';
const today=new Date().toISOString().slice(0,10);
const municipalities=JSON.parse(await fs.readFile('data/municipalities-2026.json','utf8')).municipalities;
const normalize=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').trim();
const byName=new Map();
for(const m of municipalities){for(const n of [m.name,m.canonicalName,...(m.aliases||[])].filter(Boolean))byName.set(normalize(n),m.code)}
const unwrap=x=>x&&typeof x==='object'&&'value' in x?x.value:(x?.label??x?.name??x);
const first=(o,keys)=>{for(const k of keys){const v=o?.[k];if(v!==undefined&&v!==null&&String(unwrap(v)).trim()!=='')return unwrap(v)}return null};
const asArray=v=>Array.isArray(v)?v:(v==null?[]:[v]);
function extractRows(data){
  if(Array.isArray(data))return data;
  if(Array.isArray(data?.results?.bindings))return data.results.bindings;
  if(Array.isArray(data?.results))return data.results;
  if(Array.isArray(data?.records))return data.records;
  if(Array.isArray(data?.items))return data.items;
  if(Array.isArray(data?.data))return data.data;
  if(Array.isArray(data?.features))return data.features.map(f=>({...f.properties,geometry:f.geometry}));
  if(Array.isArray(data?.['@graph']))return data['@graph'];
  return [];
}
function localId(v){const s=String(v??'');const m=s.match(/(?:monumenten|rijksmonument|id)[\/#:]?(\d{3,})$/i)||s.match(/(\d{3,})$/);return m?.[1]||s}
function addressOf(r){const direct=first(r,['adres','address','adressering','weergavenaam','locatie','volledigAdres']);if(direct)return String(direct).trim();const street=first(r,['straatnaam','straat','openbareRuimteNaam','openbareruimtenaam']);const number=first(r,['huisnummer','nummer']);const letter=first(r,['huisletter']);const addition=first(r,['huisnummertoevoeging','toevoeging']);const postcode=first(r,['postcode']);const locality=first(r,['woonplaats','plaats']);const nr=[number,letter,addition].filter(Boolean).join('');return [[street,nr].filter(Boolean).join(' '),postcode,locality].filter(Boolean).join(', ')}
function municipalityCodeOf(r){const code=String(first(r,['gemeentecode','gemeenteCode','municipalityCode'])||'');if(/^GM\d{4}$/.test(code))return code;if(/^\d{4}$/.test(code))return `GM${code}`;const name=first(r,['gemeente','gemeentenaam','gemeenteNaam','municipality']);return name?byName.get(normalize(name))||null:null}
function compactRaw(r){const keep=['type','functie','oorspronkelijke_functie','oorspronkelijkeFunctie','omschrijving','beschrijving','redengevende_omschrijving','redengevendeOmschrijving','categorie','subcategorie'];const out={};for(const k of keep)if(r?.[k]!=null)out[k]=unwrap(r[k]);return out}
function normalizeRce(r){
  const rawId=first(r,['monumentnummer','monumentNumber','rijksmonumentnummer','rijksmonument','monument','nummer','id','uri','subject']);
  const monumentNumber=localId(rawId);
  if(!/^\d{3,}$/.test(monumentNumber))return null;
  const address=addressOf(r),name=first(r,['naam','name','objectnaam','titel']),type=first(r,['type','objecttype','categorie']),functie=first(r,['functie','oorspronkelijke_functie','oorspronkelijkeFunctie']),omschrijving=first(r,['omschrijving','beschrijving','redengevende_omschrijving','redengevendeOmschrijving']);
  const classification=classifyHeritageObject({type,functie,oorspronkelijkeFunctie:functie,name,omschrijving,raw:compactRaw(r)});
  const bagPandIds=asArray(first(r,['bagPandIds','bag_pand_ids','pandidentificatie','pandIdentificatie'])).map(unwrap).filter(Boolean).map(String);
  const bagAddressIds=asArray(first(r,['bagAddressIds','bag_adres_ids','adresseerbaarobjectidentificatie','nummeraanduidingIdentificatie'])).map(unwrap).filter(Boolean).map(String);
  return {sourceId:'rce-rijksmonumentenregister',sourceRecordId:monumentNumber,monumentNumber,municipalityCode:municipalityCodeOf(r),bagPandIds,bagAddressIds,addresses:address?[address]:[],objectType:classification.objectTypes[0]||null,objectTypes:classification.objectTypes,heritageType:'rijksmonument',designationStatus:'designated',matchMethod:bagPandIds.length||bagAddressIds.length?'bag_relation':address?'address_exact':'source_assertion',name:name?String(name):null,officialUrl:`https://monumentenregister.cultureelerfgoed.nl/monumenten/${encodeURIComponent(monumentNumber)}`,checkedAt:today,objectTypeClassification:{method:classification.method,confidence:classification.confidence,taxonomyVersion:1},raw:compactRaw(r)};
}
async function fetchRows(){let last;for(let attempt=1;attempt<=4;attempt++){try{const res=await fetch(API,{headers:{Accept:'application/sparql-results+json, application/json','User-Agent':'woningencheck-heritage-import/1.1'}});if(!res.ok)throw new Error(`HTTP ${res.status}`);const data=await res.json();const rows=extractRows(data);if(!rows.length)throw new Error(`RCE antwoord bevat geen herkenbare records; top-level keys=${Object.keys(data||{}).join(',')}`);console.log(`RCE response records: ${rows.length}; sample keys: ${Object.keys(rows[0]||{}).join(',')}`);return rows}catch(e){last=e;if(attempt<4)await new Promise(r=>setTimeout(r,1000*attempt))}}throw last}
const rows=await fetchRows(),all=[],seen=new Set();
for(const raw of rows){const r=normalizeRce(raw);if(r&&!seen.has(r.sourceRecordId)){seen.add(r.sourceRecordId);all.push(r)}}
if(!all.length){console.error('RCE sample record:',JSON.stringify(rows[0]||{},null,2));throw new Error(`RCE parser quality gate: ${rows.length} bronrecords maar 0 monumentnummers herkend`)}
// Deze RCE REST-query is een samengestelde query en geen generieke paginated dump.
// Gate daarom op parser-integriteit en een plausibele opbrengst van de query zelf.
if(all.length<Math.min(100,Math.floor(rows.length*0.25)))throw new Error(`RCE parser quality gate: slechts ${all.length}/${rows.length} bronrecords herkend`);
const classified=all.filter(r=>r.objectTypes.length).length,withAddress=all.filter(r=>r.addresses.length).length,withMunicipality=all.filter(r=>r.municipalityCode).length;
const counts={};for(const r of all)for(const t of r.objectTypes)counts[t]=(counts[t]||0)+1;
const output={version:2,updatedAt:today,taxonomy:'data/heritage-object-types.json',sourceRegistry:'data/heritage-object-source-registry.json',records:all,status:{schemaReady:true,resolverReady:true,classifierReady:true,nationwideObjectImportPending:true,nationalRceImportComplete:false,municipalObjectImportCoverage:'separate-source-adapters',recordCount:all.length,classifiedObjectCount:classified,addressCount:withAddress,municipalityCodeCount:withMunicipality,note:'Officiële RCE REST-query geïmporteerd. Deze endpoint levert een queryresultaat en is niet bewezen een volledige landelijke objectdump; volledige landelijke dekking wordt daarom pas gemarkeerd na een daarvoor geschikte officiële bulk/SPARQL-import.'}};
await fs.writeFile('data/heritage-object-records.json',JSON.stringify(output,null,2)+'\n');
await fs.writeFile('data/heritage-object-import-report.json',JSON.stringify({generatedAt:new Date().toISOString(),source:API,sourceRows:rows.length,total:all.length,classified,unclassified:all.length-classified,withAddress,withMunicipality,objectTypeCounts:counts,completeNationwideDump:false},null,2)+'\n');
console.log(`RCE_IMPORT_PASS sourceRows=${rows.length} unique=${all.length} classified=${classified} address=${withAddress} municipality=${withMunicipality}`);
