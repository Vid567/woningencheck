"use strict";

import {HERITAGE_TYPES,HERITAGE_AREA_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../../../assets/heritage.js';

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

export function normalizeEnschedeMonument(record={}){
  const type=low(first(record,['type','Type','TYPE','soort','Soort','SOORT','monumenttype','Monumenttype','MONUMENTTYPE','categorie','Categorie']));
  const heritageType=type.includes('rijks')?HERITAGE_TYPES.NATIONAL_MONUMENT:type.includes('gemeent')?HERITAGE_TYPES.MUNICIPAL_MONUMENT:null;
  if(!heritageType)return null;
  const address=addressOf(record),geometry=geometryOf(record);
  return {
    sourceId:'enschede-erfgoed-monumenten',
    sourceRecordId:String(first(record,['OBJECTID','objectid','ID','id','monumentnummer','Monumentnummer','nummer','Nummer'])||address||''),
    municipalityCode:'GM0153',
    addresses:address?[address]:[],
    heritageType,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:address?MATCH_METHODS.ADDRESS:geometry?MATCH_METHODS.GEOMETRY:MATCH_METHODS.SOURCE,
    name:norm(first(record,['naam','Naam','NAAM','objectnaam','Objectnaam','omschrijving','Omschrijving']))||address||null,
    officialUrl:'https://geoportaal.enschede.nl/ArcGIS/rest/services/Erfgoed_Monumenten/MapServer',
    geometry,
    raw:record
  };
}

export function normalizeEnschedeArchaeology(record={}){
  const geometry=geometryOf(record);if(!geometry)return null;
  const name=norm(first(record,['naam','Naam','NAAM','categorie','Categorie','zone','Zone','omschrijving','Omschrijving']))||'Archeologische beleidszone Enschede';
  return {
    sourceId:'enschede-archeologie-beleidskaart',
    sourceRecordId:String(first(record,['OBJECTID','objectid','ID','id'])||name),
    municipalityCode:'GM0153',
    areaType:HERITAGE_AREA_TYPES.ARCHAEOLOGICAL,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.GEOMETRY,
    name,
    officialUrl:'https://geoportaal.enschede.nl/arcgis/rest/services/Archeologie_beleidskaart/MapServer',
    geometry,
    raw:record
  };
}

async function queryArcGis(fetchImpl,base,layer=0,{where='1=1',outFields='*'}={}){
  const params=new URLSearchParams({where,outFields,f:'geojson',returnGeometry:'true'});
  const url=`${base}/${layer}/query?${params}`;
  const r=await fetchImpl(url,{headers:{Accept:'application/geo+json,application/json'}});if(!r.ok)throw new Error(`Enschede erfgoedbron gaf ${r.status}`);
  const data=await r.json();return Array.isArray(data?.features)?data.features:[];
}

export async function fetchEnschedeMonuments(fetchImpl=fetch,{layer=0,...opts}={}){
  const features=await queryArcGis(fetchImpl,'https://geoportaal.enschede.nl/ArcGIS/rest/services/Erfgoed_Monumenten/MapServer',layer,opts);
  return features.map(f=>normalizeEnschedeMonument({...f.properties,geometry:f.geometry})).filter(Boolean);
}
export async function fetchEnschedeArchaeology(fetchImpl=fetch,{layer=0,...opts}={}){
  const features=await queryArcGis(fetchImpl,'https://geoportaal.enschede.nl/arcgis/rest/services/Archeologie_beleidskaart/MapServer',layer,opts);
  return features.map(f=>normalizeEnschedeArchaeology({...f.properties,geometry:f.geometry})).filter(Boolean);
}
