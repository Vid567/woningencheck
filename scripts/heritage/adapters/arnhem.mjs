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

export function normalizeArnhemMonument(record={}){
  const type=low(first(record,['type','Type','TYPE','soort','Soort','SOORT','monumenttype','Monumenttype','MONUMENTTYPE']));
  const heritageType=type.includes('rijks')?HERITAGE_TYPES.NATIONAL_MONUMENT:type.includes('gemeent')?HERITAGE_TYPES.MUNICIPAL_MONUMENT:null;
  if(!heritageType)return null;
  const address=addressOf(record),geometry=geometryOf(record);
  return {
    sourceId:'arnhem-opendata-monumenten-layer-12',
    sourceRecordId:String(first(record,['OBJECTID','objectid','ID','id','monumentnummer','Monumentnummer'])||address||''),
    municipalityCode:'GM0202',
    addresses:address?[address]:[],
    heritageType,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:address?MATCH_METHODS.ADDRESS:geometry?MATCH_METHODS.GEOMETRY:MATCH_METHODS.SOURCE,
    name:norm(first(record,['naam','Naam','NAAM','objectnaam','Objectnaam']))||address||null,
    officialUrl:'https://geo.arnhem.nl/arcgis/rest/services/OpenData/Monumenten/MapServer/12',
    geometry,
    raw:record
  };
}

export function normalizeArnhemProtectedView(record={}){
  const type=low(first(record,['type','Type','TYPE','soort','Soort','SOORT','categorie','Categorie','CATEGORIE']));
  const geometry=geometryOf(record);if(!geometry)return null;
  return {
    sourceId:'arnhem-opendata-stadsgezichten-layer-11',
    sourceRecordId:String(first(record,['OBJECTID','objectid','ID','id'])||first(record,['naam','Naam','NAAM'])||''),
    municipalityCode:'GM0202',
    areaType:type.includes('gemeent')?HERITAGE_AREA_TYPES.MUNICIPAL_PROTECTED_VIEW:HERITAGE_AREA_TYPES.NATIONAL_PROTECTED_VIEW,
    designationStatus:DESIGNATION_STATUS.DESIGNATED,
    matchMethod:MATCH_METHODS.GEOMETRY,
    name:norm(first(record,['naam','Naam','NAAM','gebied','Gebied']))||'Beschermd stadsgezicht Arnhem',
    officialUrl:'https://geo.arnhem.nl/arcgis/rest/services/OpenData/Monumenten/MapServer/11',
    geometry,
    raw:record
  };
}

async function queryLayer(fetchImpl,layer,{where='1=1',outFields='*'}={}){
  const params=new URLSearchParams({where,outFields,f:'geojson',returnGeometry:'true'});
  const url=`https://geo.arnhem.nl/arcgis/rest/services/OpenData/Monumenten/MapServer/${layer}/query?${params}`;
  const r=await fetchImpl(url,{headers:{Accept:'application/geo+json,application/json'}});if(!r.ok)throw new Error(`Arnhem erfgoedlaag ${layer} gaf ${r.status}`);
  const data=await r.json();return Array.isArray(data?.features)?data.features:[];
}
export async function fetchArnhemMonuments(fetchImpl=fetch,opts={}){const features=await queryLayer(fetchImpl,12,opts);return features.map(f=>normalizeArnhemMonument({...f.properties,geometry:f.geometry})).filter(Boolean)}
export async function fetchArnhemProtectedViews(fetchImpl=fetch,opts={}){const features=await queryLayer(fetchImpl,11,opts);return features.map(f=>normalizeArnhemProtectedView({...f.properties,geometry:f.geometry})).filter(Boolean)}
