"use strict";

import {HERITAGE_TYPES,HERITAGE_AREA_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../../../assets/heritage.js';

const norm=v=>String(v??'').trim();
const addressOf=r=>{
  const street=norm(r.OPENBARERUIMTENAAM||r.openbareruimtenaam||r.straatnaam);
  const number=norm(r.HUISNUMMER||r.huisnummer);
  const letter=norm(r.HUISLETTER||r.huisletter);
  const addition=norm(r.TOEVOEGING||r.toevoeging);
  const postcode=norm(r.POSTCODE||r.postcode).replace(/\s+/g,'').toUpperCase();
  const suffix=[letter,addition].filter(Boolean).join(' ');
  return [street,[number,suffix].filter(Boolean).join(' '),postcode].filter(Boolean).join(', ');
};
const geometryOf=r=>r.geometry||r.GEOMETRIE||r.geometrie||null;

export function normalizeUtrechtImageDefining(record={}){
  const address=addressOf(record);
  if(!address)return null;
  return {
    sourceId:'utrecht-beeldbepalend-pand',
    sourceRecordId:String(record.PK_ID||record.pk_id||record.MONNR||record.monnr||address),
    municipalityCode:'GM0344',
    addresses:[address],
    heritageType:HERITAGE_TYPES.IMAGE_DEFINING,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.ADDRESS,
    name:record.LOCATIE||record.locatie||address,
    officialUrl:'https://open.utrecht.nl/dataset/beeldbepalend-pand/4700205e-1969-4bf9-a4ca-f054abd71b8a',
    geometry:geometryOf(record),
    raw:record
  };
}

export function normalizeUtrechtMonument(record={}){
  const type=norm(record.MONUMENTTYPE||record.monumenttype||record.TYPE||record.type).toLowerCase();
  const heritageType=type.includes('rijks')?HERITAGE_TYPES.NATIONAL_MONUMENT:type.includes('gemeent')?HERITAGE_TYPES.MUNICIPAL_MONUMENT:null;
  if(!heritageType)return null;
  const address=addressOf(record)||norm(record.ADRES||record.adres);
  return {
    sourceId:'utrecht-monumenten-open',
    sourceRecordId:String(record.PK_ID||record.pk_id||record.MONNR||record.monnr||record.MONUMENTNUMMER||record.monumentnummer||address),
    municipalityCode:'GM0344',
    addresses:address?[address]:[],
    heritageType,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.ADDRESS,
    name:record.NAAM||record.naam||address||null,
    officialUrl:'https://www.utrecht.nl/wonen-en-leven/wonen/uw-koopwoning/monument/monumentenlijst',
    geometry:geometryOf(record),
    raw:record
  };
}

export function normalizeUtrechtProtectedView(record={}){
  const name=norm(record.NAAM||record.naam||record.LOCATIE||record.locatie||'Beschermd stads- of dorpsgezicht');
  const type=norm(record.TYPE||record.type||record.CATEGORIE||record.categorie).toLowerCase();
  return {
    sourceId:'utrecht-beschermd-gezicht',
    sourceRecordId:String(record.PK_ID||record.pk_id||record.ID||record.id||name),
    municipalityCode:'GM0344',
    areaType:type.includes('rijks')?HERITAGE_AREA_TYPES.NATIONAL_PROTECTED_VIEW:HERITAGE_AREA_TYPES.MUNICIPAL_PROTECTED_VIEW,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.GEOMETRY,
    name,
    officialUrl:'https://www.utrecht.nl/wonen-en-leven/wonen/uw-koopwoning/monument/beschermd-stads-of-dorpsgezicht/',
    geometry:geometryOf(record),
    raw:record
  };
}

export async function fetchUtrechtImageDefining(fetchImpl=fetch,{url}={}){
  if(!url)throw new Error('Utrecht beeldbepalend WFS/JSON url ontbreekt');
  const r=await fetchImpl(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Utrecht beeldbepalend gaf ${r.status}`);
  const data=await r.json();const features=Array.isArray(data?.features)?data.features:[];
  return features.map(f=>normalizeUtrechtImageDefining({...f.properties,geometry:f.geometry})).filter(Boolean);
}

export async function fetchUtrechtMonuments(fetchImpl=fetch,{url}={}){
  if(!url)throw new Error('Utrecht monumenten WFS/JSON url ontbreekt');
  const r=await fetchImpl(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Utrecht monumenten gaf ${r.status}`);
  const data=await r.json();const features=Array.isArray(data?.features)?data.features:[];
  return features.map(f=>normalizeUtrechtMonument({...f.properties,geometry:f.geometry})).filter(Boolean);
}
