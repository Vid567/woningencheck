"use strict";

export const HERITAGE_TYPES={
  NATIONAL_MONUMENT:"rijksmonument",
  MUNICIPAL_MONUMENT:"gemeentelijk-monument",
  PROVINCIAL_MONUMENT:"provinciaal-monument",
  CHARACTERISTIC:"karakteristiek-pand",
  IMAGE_DEFINING:"beeldbepalend-pand",
  CULTURAL_HISTORIC:"cultuurhistorisch-waardevol",
  BUILDING_HISTORIC:"bouwhistoriemonument",
  CITYSCAPE_OBJECT:"stadsbeeldobject",
  IDENTITY_OBJECT:"identiteitsbepalend-object"
};
export const HERITAGE_AREA_TYPES={
  NATIONAL_PROTECTED_VIEW:"rijksbeschermd-stads-dorpsgezicht",
  MUNICIPAL_PROTECTED_VIEW:"gemeentelijk-beschermd-stads-dorpsgezicht",
  UNESCO:"unesco-erfgoedgebied",
  ARCHAEOLOGICAL:"archeologisch-waardegebied",
  CULTURAL_HISTORIC_ZONE:"cultuurhistorische-zone"
};
export const DESIGNATION_STATUS={DESIGNATED:"designated",PREPROTECTED:"preprotected",UNDER_REVIEW:"under_review"};
export const MATCH_METHODS={BAG:"bag_relation",ADDRESS:"address_exact",GEOMETRY:"geometry_intersection",SOURCE:"source_assertion",MANUAL:"manual"};
export const HERITAGE_OBJECT_TYPES=new Set([
  "kerk","kapel","klooster","abdij","synagoge","moskee","tempel","paleis","kasteel",
  "buitenplaats","landhuis","herenhuis","boerderij","molen","fabriek","watertoren","gemaal",
  "brug","station","vuurtoren","fort","bunker","poort","stadhuis","gerechtsgebouw","school",
  "ziekenhuis","begraafplaats","woonhuis","winkelpand","horecapand","theater","museum",
  "ander-erfgoedobject"
]);

const norm=v=>String(v??"").trim().toLowerCase();
const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const validDesignation=new Set(Object.values(DESIGNATION_STATUS));
const validMatch=new Set(Object.values(MATCH_METHODS));

export function normalizeHeritageAddress(value){
  return String(value??"")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\b(\d{4})\s*([a-z]{2})\b/g,"$1$2")
    .replace(/[,;|]/g," ")
    .replace(/\s*[-/]\s*/g,"-")
    .replace(/[^a-z0-9-]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

export function pdokHeritageAddress(address={}){
  const street=address.straatnaam||address.street||"";
  const number=address.huisnummer??address.houseNumber??"";
  const addition=[address.huisletter||address.houseLetter||"",address.huisnummertoevoeging||address.houseNumberAddition||address.addition||""].filter(Boolean).join("");
  const postcode=address.postcode||"";
  const place=address.woonplaatsnaam||address.woonplaats||address.city||"";
  return [street,`${number}${addition}`,postcode,place].filter(Boolean).join(" ");
}

function normalizeObjectTypes(record={}){
  const values=arr(record.objectTypes?.length?record.objectTypes:record.objectType).filter(Boolean).map(norm);
  const unique=[...new Set(values)];
  for(const type of unique){if(!HERITAGE_OBJECT_TYPES.has(type))throw new Error(`ongeldig heritage objectType: ${type}`)}
  return unique;
}

export function normalizeHeritageRecord(record={}){
  if(!record.sourceId)throw new Error("heritage record mist sourceId");
  if(!record.heritageType&&!record.areaType)throw new Error("heritage record mist heritageType/areaType");
  const designationStatus=record.designationStatus||DESIGNATION_STATUS.DESIGNATED;
  if(!validDesignation.has(designationStatus))throw new Error(`ongeldige designationStatus: ${designationStatus}`);
  const matchMethod=record.matchMethod||MATCH_METHODS.SOURCE;
  if(!validMatch.has(matchMethod))throw new Error(`ongeldige matchMethod: ${matchMethod}`);
  const objectTypes=normalizeObjectTypes(record);
  return {sourceId:String(record.sourceId),sourceRecordId:record.sourceRecordId==null?null:String(record.sourceRecordId),monumentNumber:record.monumentNumber==null?(record.monumentnummer==null?null:String(record.monumentnummer)):String(record.monumentNumber),municipalityCode:record.municipalityCode||null,bagPandIds:arr(record.bagPandIds).map(String),bagAddressIds:arr(record.bagAddressIds).map(String),addresses:arr(record.addresses).map(String),objectType:objectTypes[0]||null,objectTypes,heritageType:record.heritageType||null,areaType:record.areaType||null,designationStatus,matchMethod,legalEffect:record.legalEffect||null,name:record.name||null,officialUrl:record.officialUrl||null,sourceUpdatedAt:record.sourceUpdatedAt||null,checkedAt:record.checkedAt||null,geometry:record.geometry||null,raw:record.raw||null};
}

function addressCandidates(address={}){
  return [...new Set([
    address.displayName,address.weergavenaam,pdokHeritageAddress(address),
    [address.street||address.straatnaam,address.houseNumber||address.huisnummer,address.postcode,address.city||address.woonplaatsnaam||address.woonplaats].filter(Boolean).join(" ")
  ].map(normalizeHeritageAddress).filter(Boolean))];
}
function exactAddressMatch(address,record){
  const candidates=addressCandidates(address);
  if(!candidates.length)return false;
  const official=record.addresses.map(normalizeHeritageAddress);
  return candidates.some(candidate=>official.includes(candidate));
}
function bagMatch(address,record){
  const pand=String(address?.bagPandId||address?.pand_id||address?.pandId||"");
  const ao=String(address?.bagObjectId||address?.adresseerbaarobject_id||address?.adresseerbaarObjectId||"");
  return (!!pand&&record.bagPandIds.includes(pand))|| (!!ao&&record.bagAddressIds.includes(ao));
}
function pointInRing(point,ring){let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>point[1])!==(yj>point[1]))&&(point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi))hit=!hit}return hit}
function geometryMatch(address,record){const lon=Number(address?.longitude??address?.location?.longitude),lat=Number(address?.latitude??address?.location?.latitude);if(!Number.isFinite(lon)||!Number.isFinite(lat)||!record.geometry)return false;const g=record.geometry;if(g.type==="Polygon")return pointInRing([lon,lat],g.coordinates?.[0]||[]);if(g.type==="MultiPolygon")return (g.coordinates||[]).some(p=>pointInRing([lon,lat],p?.[0]||[]));return false}
function recordMatches(address,record){if(record.municipalityCode&&address?.municipalityCode&&record.municipalityCode!==address.municipalityCode)return false;if(record.matchMethod===MATCH_METHODS.BAG&&bagMatch(address,record))return true;if(record.matchMethod===MATCH_METHODS.BAG||record.matchMethod===MATCH_METHODS.ADDRESS)return exactAddressMatch(address,record);if(record.matchMethod===MATCH_METHODS.GEOMETRY)return geometryMatch(address,record);if(record.matchMethod===MATCH_METHODS.SOURCE)return record.municipalityCode&&record.municipalityCode===address?.municipalityCode&&record.raw?.applies===true;return false}
function recordIdentity(r){return {monumentNumber:r.monumentNumber,objectType:r.objectType,objectTypes:r.objectTypes,bagPandIds:r.bagPandIds,bagAddressIds:r.bagAddressIds,addresses:r.addresses}}

export function resolveHeritageForAddress(address={},records=[]){
  const normalized=records.map(normalizeHeritageRecord),matches=normalized.filter(r=>recordMatches(address,r));
  const objectStatuses=matches.filter(r=>r.heritageType).map(r=>({type:r.heritageType,designationStatus:r.designationStatus,name:r.name,legalEffect:r.legalEffect,sourceId:r.sourceId,sourceRecordId:r.sourceRecordId,officialUrl:r.officialUrl,matchMethod:r.matchMethod,checkedAt:r.checkedAt,...recordIdentity(r)}));
  const areaStatuses=matches.filter(r=>r.areaType).map(r=>({type:r.areaType,designationStatus:r.designationStatus,name:r.name,legalEffect:r.legalEffect,sourceId:r.sourceId,sourceRecordId:r.sourceRecordId,officialUrl:r.officialUrl,matchMethod:r.matchMethod,checkedAt:r.checkedAt,...recordIdentity(r)}));
  const objectTypes=[...new Set(matches.flatMap(r=>r.objectTypes))];
  const heritageObjects=matches.filter(r=>r.objectTypes.length||r.monumentNumber||r.bagPandIds.length||r.bagAddressIds.length||r.addresses.length).map(r=>({name:r.name,heritageType:r.heritageType,areaType:r.areaType,designationStatus:r.designationStatus,sourceId:r.sourceId,sourceRecordId:r.sourceRecordId,officialUrl:r.officialUrl,matchMethod:r.matchMethod,...recordIdentity(r)}));
  const protectedObject=objectStatuses.some(x=>x.designationStatus===DESIGNATION_STATUS.DESIGNATED||x.designationStatus===DESIGNATION_STATUS.PREPROTECTED),protectedArea=areaStatuses.some(x=>x.designationStatus===DESIGNATION_STATUS.DESIGNATED||x.designationStatus===DESIGNATION_STATUS.PREPROTECTED);
  return {objectStatuses,areaStatuses,objectTypes,heritageObjects,protectedObject,protectedArea,hasHeritageTrigger:protectedObject||protectedArea,matches:matches.length};
}
export function heritageLegalTriggers(result,activity){const a=norm(activity),triggers=[];if(result.protectedObject&&/(verbouw|renovat|kozijn|gevel|dak|dakkapel|sloop|splits|functie|zonne)/.test(a))triggers.push("object-erfgoedtoets");if(result.protectedArea&&/(bouw|verbouw|renovat|gevel|dak|dakkapel|sloop|functie)/.test(a))triggers.push("gebied-erfgoedtoets");return [...new Set(triggers)]}
