"use strict";

import {HERITAGE_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../../../assets/heritage.js';

const norm=v=>String(v??'').trim();
const low=v=>norm(v).toLowerCase();
const first=(r,names)=>{for(const n of names)if(r[n]!=null&&norm(r[n]))return r[n];return null};
const geometryOf=r=>r.geometry||r.geometrie||r.GEOMETRIE||null;

function addressOf(r){
  const direct=first(r,['adres','Adres','ADRES','locatie','Locatie','LOCATIE']);
  if(direct)return norm(direct);
  const street=norm(first(r,['straatnaam','Straatnaam','STRAATNAAM','straat','Straat']));
  const number=norm(first(r,['huisnummer','Huisnummer','HUISNUMMER']));
  const addition=norm(first(r,['toevoeging','Toevoeging','TOEVOEGING','huisnummertoevoeging']));
  const postcode=norm(first(r,['postcode','Postcode','POSTCODE'])).replace(/\s+/g,'').toUpperCase();
  return [street,[number,addition].filter(Boolean).join(' '),postcode].filter(Boolean).join(', ');
}
function typeOf(r){return low(first(r,['type','Type','TYPE','soort','Soort','SOORT','categorie','Categorie','CATEGORIE','objecttype','Objecttype']));}
function statusOf(r){return low(first(r,['status','Status','STATUS','fase','Fase','FASE','aanwijzingsstatus','Aanwijzingsstatus']));}
function heritageTypeOf(r){
  const t=typeOf(r);
  if(t.includes('rijks'))return HERITAGE_TYPES.NATIONAL_MONUMENT;
  if(t.includes('gemeent')&&t.includes('monument'))return HERITAGE_TYPES.MUNICIPAL_MONUMENT;
  if(t.includes('cultuurhistor'))return HERITAGE_TYPES.CULTURAL_HISTORIC;
  return null;
}
function designationOf(r,sourceKind='designated'){
  const s=statusOf(r);
  if(sourceKind==='preprotection'||s.includes('voorbescherm'))return DESIGNATION_STATUS.PREPROTECTED;
  if(sourceKind==='review'||s.includes('onderzoek')||s.includes('ontwerp'))return DESIGNATION_STATUS.UNDER_REVIEW;
  return DESIGNATION_STATUS.DESIGNATED;
}

export function normalizeEindhovenRecord(record={},sourceKind='designated'){
  const heritageType=heritageTypeOf(record);
  if(!heritageType)return null;
  const address=addressOf(record);
  const geometry=geometryOf(record);
  return {
    sourceId:sourceKind==='designated'?'eindhoven-monumenten': 'eindhoven-monumenten-ontwerp-voorbescherming',
    sourceRecordId:String(first(record,['id','ID','objectid','OBJECTID','identificatie','Identificatie','monumentnummer','Monumentnummer'])||address||''),
    municipalityCode:'GM0772',
    addresses:address?[address]:[],
    heritageType,
    designationStatus:designationOf(record,sourceKind),
    matchMethod:address?MATCH_METHODS.ADDRESS:geometry?MATCH_METHODS.GEOMETRY:MATCH_METHODS.SOURCE,
    name:norm(first(record,['naam','Naam','NAAM','objectnaam','Objectnaam']))||address||null,
    officialUrl:sourceKind==='designated'?'https://data.eindhoven.nl/explore/dataset/monumenten/':'https://data.eindhoven.nl/explore/dataset/monumenten-in-ontwerp-en-voorbescherming/',
    geometry,
    legalEffect:designationOf(record,sourceKind)===DESIGNATION_STATUS.PREPROTECTED?'voorbescherming-actief':designationOf(record,sourceKind)===DESIGNATION_STATUS.UNDER_REVIEW?'nog-geen-extra-bescherming':null,
    raw:record
  };
}

export function normalizeEindhovenDesignated(record={}){return normalizeEindhovenRecord(record,'designated')}
export function normalizeEindhovenPreprotected(record={}){return normalizeEindhovenRecord(record,'preprotection')}
export function normalizeEindhovenUnderReview(record={}){return normalizeEindhovenRecord(record,'review')}

async function fetchDataset(fetchImpl,url,sourceKind){
  const r=await fetchImpl(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Eindhoven erfgoedbron gaf ${r.status}`);
  const data=await r.json();
  const records=Array.isArray(data?.results)?data.results:Array.isArray(data?.records)?data.records:Array.isArray(data)?data:[];
  return records.map(x=>normalizeEindhovenRecord(x.fields||x,sourceKind)).filter(Boolean);
}
export async function fetchEindhovenDesignated(fetchImpl=fetch,{url='https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/monumenten/records?limit=100'}={}){return fetchDataset(fetchImpl,url,'designated')}
export async function fetchEindhovenPreprotection(fetchImpl=fetch,{url='https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/monumenten-in-ontwerp-en-voorbescherming/records?limit=100'}={}){
  const all=await fetchDataset(fetchImpl,url,'designated');
  return all.map(r=>({...r,designationStatus:designationOf(r.raw,statusOf(r.raw).includes('voorbescherm')?'preprotection':'review'),legalEffect:statusOf(r.raw).includes('voorbescherm')?'voorbescherming-actief':'nog-geen-extra-bescherming'}));
}
