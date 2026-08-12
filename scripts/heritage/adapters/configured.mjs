"use strict";

import {HERITAGE_TYPES,HERITAGE_AREA_TYPES,DESIGNATION_STATUS,MATCH_METHODS} from '../../../assets/heritage.js';

const norm=v=>String(v??'').trim();
const low=v=>norm(v).toLowerCase();
const get=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const first=(r,paths=[])=>{for(const p of paths){const v=p.includes('.')?get(r,p):r[p];if(v!=null&&norm(v))return v}return null};

function addressOf(r,c){const direct=first(r,c.addressFields||['adres','Adres','ADRES','address','Address','locatie','Locatie','LOCATIE']);if(direct)return norm(direct);const street=norm(first(r,c.streetFields||['straat','straatnaam','Straatnaam'])),number=norm(first(r,c.numberFields||['huisnummer','Huisnummer'])),addition=norm(first(r,c.additionFields||['toevoeging','Toevoeging'])),postcode=norm(first(r,c.postcodeFields||['postcode','Postcode'])).replace(/\s+/g,'').toUpperCase();return [street,[number,addition].filter(Boolean).join(' '),postcode].filter(Boolean).join(', ')}
function geometryOf(r,c){return first(r,c.geometryFields||['geometry','geometrie','GEOMETRIE'])||r.geometry||r.geometrie||null}
function mapType(value,map){const s=low(value);for(const [needle,target] of Object.entries(map||{}))if(s.includes(low(needle)))return target;return null}
function designationOf(r,c){const s=low(first(r,c.statusFields||['status','Status','fase','Fase']));if((c.preprotectedTerms||['voorbescherm']).some(x=>s.includes(low(x))))return DESIGNATION_STATUS.PREPROTECTED;if((c.reviewTerms||['onderzoek','ontwerp']).some(x=>s.includes(low(x))))return DESIGNATION_STATUS.UNDER_REVIEW;return DESIGNATION_STATUS.DESIGNATED}

export function normalizeConfiguredHeritage(record={},config={}){
  const typeValue=first(record,config.typeFields||['type','Type','soort','Soort','categorie','Categorie','status','Status']);
  const rawObjectType=mapType(typeValue,config.objectTypeMap);
  const areaType=mapType(typeValue,config.areaTypeMap);
  const address=addressOf(record,config),geometry=geometryOf(record,config);
  // If a record explicitly matches an area category and has geometry, treat it as area-only.
  // This prevents broad object substrings such as "cultuurhistorisch" from turning zones into monument-like objects.
  const heritageType=areaType&&geometry?null:rawObjectType;
  if(!heritageType&&!areaType)return null;
  const designationStatus=designationOf(record,config);
  const matchMethod=heritageType?(address?MATCH_METHODS.ADDRESS:geometry?MATCH_METHODS.GEOMETRY:MATCH_METHODS.SOURCE):(geometry?MATCH_METHODS.GEOMETRY:address?MATCH_METHODS.ADDRESS:MATCH_METHODS.SOURCE);
  return {sourceId:config.sourceId,sourceRecordId:String(first(record,config.idFields||['id','ID','OBJECTID','objectid','monumentnummer','Monumentnummer'])||address||''),municipalityCode:config.municipalityCode,addresses:address?[address]:[],heritageType:heritageType||null,areaType:areaType||null,designationStatus,matchMethod,name:norm(first(record,config.nameFields||['naam','Naam','omschrijving','Omschrijving']))||address||null,officialUrl:config.officialUrl||null,geometry,legalEffect:designationStatus===DESIGNATION_STATUS.PREPROTECTED?'voorbescherming-actief':designationStatus===DESIGNATION_STATUS.UNDER_REVIEW?'nog-geen-extra-bescherming':null,raw:record};
}

export function normalizeConfiguredCollection(records=[],config={}){return records.map(r=>normalizeConfiguredHeritage(r,config)).filter(Boolean)}

export {HERITAGE_TYPES,HERITAGE_AREA_TYPES};
