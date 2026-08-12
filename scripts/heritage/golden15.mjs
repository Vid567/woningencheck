"use strict";
import fs from 'node:fs';
import {normalizeConfiguredHeritage} from './adapters/configured.mjs';

const registry=JSON.parse(fs.readFileSync(new URL('../../data/heritage-golden15-config.json',import.meta.url),'utf8'));
export const GOLDEN15=registry.municipalities;
export function configForMunicipality(nameOrCode){const c=GOLDEN15.find(x=>x.name===nameOrCode||x.municipalityCode===nameOrCode);if(!c)return null;return{sourceId:c.sourceId,municipalityCode:c.municipalityCode,officialUrl:c.officialUrl,objectTypeMap:c.objectTypes,areaTypeMap:c.areaTypes,addressFields:['adres','Adres','ADRES'],statusFields:['status','Status','fase','Fase','aanwijzingsstatus','Aanwijzingsstatus']}}
export function normalizeGolden15(nameOrCode,record){const c=configForMunicipality(nameOrCode);if(!c)throw new Error(`Onbekende golden erfgoedgemeente: ${nameOrCode}`);return normalizeConfiguredHeritage(record,c)}
