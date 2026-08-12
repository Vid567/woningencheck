"use strict";

import {HERITAGE_TYPES,HERITAGE_AREA_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../../../assets/heritage.js';

const nationalTypes=new Set(['Rijksmonument','Rijksmonumenten']);
const municipalTypes=new Set(['Gemeentelijk monument','Gemeentelijke monumenten']);
const asArray=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const relId=v=>typeof v==='string'?v:(v?.identificatie||v?.id||null);

export function normalizeAmsterdamMonument(record={}){
  const type=record.typeMonument?.omschrijving||record.typeMonument||record.monumentType||record.type||'';
  const heritageType=nationalTypes.has(type)?HERITAGE_TYPES.NATIONAL_MONUMENT:municipalTypes.has(type)?HERITAGE_TYPES.MUNICIPAL_MONUMENT:null;
  if(!heritageType)return null;
  const pandIds=asArray(record.betreftBagPand).map(relId).filter(Boolean).map(String);
  const addressIds=asArray(record.betreftBagNummeraanduiding).map(relId).filter(Boolean).map(String);
  return {
    sourceId:'amsterdam-monumenten-v1',
    sourceRecordId:String(record.identificatie||record.id||record.monumentnummer||''),
    municipalityCode:'GM0363',
    bagPandIds:pandIds,
    bagAddressIds:addressIds,
    addresses:record.adressering?[String(record.adressering)]:[],
    heritageType,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:pandIds.length||addressIds.length?MATCH_METHODS.BAG:MATCH_METHODS.ADDRESS,
    name:record.weergavenaam||record.naam||null,
    officialUrl:'https://api.data.amsterdam.nl/v1/docs/datasets/monumenten%40v1.html',
    sourceUpdatedAt:record.datumActueelTot||record.datum_actueel_tot||null,
    raw:record
  };
}

export function normalizeAmsterdamSituering(record={}){
  const addressId=relId(record.betreftBagNummeraanduiding);
  const monumentId=relId(record.hoortBijMonumentenMonument);
  if(!addressId||!monumentId)return null;
  return {monumentId:String(monumentId),addressId:String(addressId),primary:String(record.eersteSituering||'').toUpperCase()==='J'};
}

export function joinAmsterdamSitueringen(monuments=[],situeringen=[]){
  const byId=new Map(monuments.map(m=>[String(m.sourceRecordId),{...m,bagAddressIds:[...(m.bagAddressIds||[])]}]));
  for(const s of situeringen){if(!s)continue;const m=byId.get(String(s.monumentId));if(m&&!m.bagAddressIds.includes(String(s.addressId)))m.bagAddressIds.push(String(s.addressId));}
  return [...byId.values()];
}

export function normalizeAmsterdamUnesco(record={}){
  if(!record.geometrie&&!record.geometry)return null;
  return {
    sourceId:'amsterdam-monumenten-v1-unesco',
    sourceRecordId:String(record.identificatie||record.id||''),
    municipalityCode:'GM0363',
    areaType:HERITAGE_AREA_TYPES.UNESCO,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.GEOMETRY,
    name:record.naam||'UNESCO Werelderfgoed Amsterdam',
    officialUrl:'https://api.data.amsterdam.nl/v1/wfs/monumenten/v1',
    geometry:record.geometrie||record.geometry,
    sourceUpdatedAt:record.datumActueelTot||record.datum_actueel_tot||null,
    raw:record
  };
}

export async function fetchAmsterdamHeritage(fetchImpl=fetch,{limit=1000}={}){
  const base='https://api.data.amsterdam.nl/v1/monumenten/v1';
  const get=async path=>{const r=await fetchImpl(`${base}/${path}?page_size=${limit}`,{headers:{Accept:'application/hal+json'}});if(!r.ok)throw new Error(`Amsterdam erfgoedbron ${path} gaf ${r.status}`);return r.json()};
  const extract=data=>data?._embedded?Object.values(data._embedded).flat().filter(x=>x&&typeof x==='object'):Array.isArray(data)?data:(data?.results||[]);
  const [monumentsRaw,situRaw]=await Promise.all([get('monumenten'),get('situeringen')]);
  const monuments=extract(monumentsRaw).map(normalizeAmsterdamMonument).filter(Boolean);
  const situeringen=extract(situRaw).map(normalizeAmsterdamSituering).filter(Boolean);
  return joinAmsterdamSitueringen(monuments,situeringen);
}
