Exit code: 0
Wall time: 4.1 seconds
Output:
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const date = '2026-08-09';
const taxonomy = read('data/permit-taxonomy.json').permitTypes.map(x => x.canonicalType);
const municipalities = [
  ['GM1680','Aa en Hunze','Drenthe','Spiekersteeg 1','9461BH','Gieten'],
  ['GM0358','Aalsmeer','Noord-Holland','Raadhuisplein 1','1431EH','Aalsmeer'],
  ['GM0197','Aalten','Gelderland','Markt 7','7121CS','Aalten'],
  ['GM0059','Achtkarspelen','FryslÃ¢n','Stationsstraat 18','9285NH','Buitenpost'],
  ['GM0482','Alblasserdam','Zuid-Holland','Cortgene 2','2951ED','Alblasserdam'],
  ['GM0613','Albrandswaard','Zuid-Holland','Hofhoek 5','3176PD','Poortugaal'],
  ['GM0361','Alkmaar','Noord-Holland','Mallegatsplein 10','1815AG','Alkmaar'],
  ['GM0141','Almelo','Overijssel','Haven Zuidzijde 30','7607EW','Almelo'],
  ['GM0034','Almere','Flevoland','Stadhuisplein 1','1315HR','Almere'],
  ['GM0484','Alphen aan den Rijn','Zuid-Holland','Stadhuisplein 1','2405SH','Alphen aan den Rijn']
];
const sources = {
  aalsmeerHvv:'https://lokaleregelgeving.overheid.nl/CVDR749527', aalsmeerVac:'https://lokaleregelgeving.overheid.nl/CVDR623005',
  aalten:'https://lokaleregelgeving.overheid.nl/CVDR720987', acht:'https://lokaleregelgeving.overheid.nl/CVDR705002',
  alblasserdam:'https://lokaleregelgeving.overheid.nl/CVDR741471', albrandswaard:'https://lokaleregelgeving.overheid.nl/CVDR741224',
  albrandswaardRent:'https://lokaleregelgeving.overheid.nl/CVDR660521', alkmaar:'https://lokaleregelgeving.overheid.nl/CVDR713872',
  almeloBuy:'https://lokaleregelgeving.overheid.nl/CVDR726069', almeloVac:'https://lokaleregelgeving.overheid.nl/CVDR638723',
  almere:'https://lokaleregelgeving.overheid.nl/CVDR741425'
};
const finding = (id, code, types, title, url, scope, level, facts={}) => ({id, municipalityCode:code, canonicalTypes:types, title, officialRegulationUrl:url, officialInfoUrl:null, officialApplicationUrl:null, applicationRouteStatus:'not-confirmed', legalBasis:facts.legalBasis || [], effectiveFrom:facts.effectiveFrom || null, effectiveTo:facts.effectiveTo || null, geographicScope:scope, extractedFacts:facts.extractedFacts || [], requiredDocuments:facts.requiredDocuments || [], reviewLevel:level, substantiveVerificationStatus: level === 'A' ? 'objective-facts-confirmed' : 'research-pending-review', verifiedAt:date});
const findings = [
 finding('aalsmeer-hvv-2025','GM0358',['housing-permit','withdrawal-merger','purchase-protection'],'Huisvestingsverordening gemeente Aalsmeer 2025',sources.aalsmeerHvv,{method:'whole-municipality',conditions:['De afzonderlijke hoofdstukken hanteren daarnaast woning- en waardekenmerken.']},'B',{legalBasis:['Huisvestingswet 2014'],effectiveFrom:'2025-12-11',extractedFacts:['Huisvestingsvergunning voor aangewezen betaalbare woonruimte.','Onttrekkingsvergunning en opkoopbescherming zijn afzonderlijk geregeld.']}),
 finding('aalsmeer-vacancy-2019','GM0358',['vacancy-obligation'],'Leegstandverordening Aalsmeer 2019',sources.aalsmeerVac,{method:'whole-municipality',conditions:['Zelfstandige woonruimte en kantoren groter dan 500 mÂ²; melding na zes maanden.']},'A',{legalBasis:['Leegstandwet'],effectiveFrom:'2019-07-01'}),
 finding('aalten-good-landlord-2024','GM0197',['good-landlord-permit'],'Verhuurverordening verblijfsruimte Aalten 2024',sources.aalten,{method:'whole-municipality',conditions:['Alle verblijfsruimte; woningcorporaties uitgezonderd.']},'B',{legalBasis:['Wet goed verhuurderschap'],effectiveFrom:'2024-06-18',requiredDocuments:['Modelhuurovereenkomst â€” Zelf aanleveren','Beschrijving naleving goed verhuurderschap â€” Zelf aanleveren','Opgave handhavingsbesluiten â€” Zelf aanleveren']}),
 finding('achtkarspelen-target-groups-2023','GM0059',[],'Doelgroepenverordening gemeente Achtkarspelen 2023',sources.acht,{method:'development-specific',conditions:['Alleen woningen waarop een planologische doelgroepenbestemming en instandhoudingstermijn rust.']},'C',{extractedFacts:['Meldplicht bij verhuur is gevonden, maar valt niet rechtstreeks onder de huidige vergunningtaxonomie.']}),
 finding('alblasserdam-hvv-2025','GM0482',['housing-permit'],'Huisvestingsverordening Gemeente Alblasserdam 2025',sources.alblasserdam,{method:'municipality-and-property-conditions',conditions:['Exact toepassingsbereik moet inhoudelijk worden gecontroleerd vÃ³Ã³r publicatie.']},'C',{legalBasis:['Huisvestingswet 2014'],effectiveFrom:'2025-07-10'}),
 finding('albrandswaard-regional-housing-2025','GM0613',['housing-permit'],'Verordening Woonruimtebemiddeling regio Rotterdam 2025',sources.albrandswaard,{method:'whole-municipality',conditions:['Regionale woonruimtebemiddeling; alleen aangewezen woonruimte en woningzoekenden.']},'B',{legalBasis:['Huisvestingswet 2014'],effectiveFrom:'2025-07-01',effectiveTo:'2029-06-30'}),
 finding('albrandswaard-rental-notification-2021','GM0613',[],'Verordening sociale huur en middeldure huur gemeente Albrandswaard 2021',sources.albrandswaardRent,{method:'development-specific',conditions:['Meldplicht gedurende instandhoudingstermijn van aangewezen nieuwbouwwoningen.']},'C',{effectiveFrom:'2021-07-20'}),
 finding('alkmaar-hvv-2024','GM0361',['housing-permit','conversion-permit','room-rental','dwelling-formation','withdrawal-merger'],'Huisvestingsverordening Alkmaar 2024',sources.alkmaar,{method:'whole-municipality-with-inner-city-branch',conditions:['Voorraadwijziging gemeentebreed; oppervlakteeisen verschillen binnen/buiten binnenstad.']},'B',{legalBasis:['Huisvestingswet 2014'],effectiveFrom:'2026-02-26',requiredDocuments:['Vastgesteld aanvraagformulier â€” officiÃ«le route nog te bevestigen','Situatie- en leefbaarheidsgegevens â€” Zelf aanleveren']}),
 finding('almelo-purchase-protection-2024','GM0141',['purchase-protection'],'Huisvestingverordening Opkoopbescherming gemeente Almelo',sources.almeloBuy,{method:'cbs-district-list-and-value',conditions:['CBS-wijken 014110, 014115, 014116, 014111, 014114, 014113 en 014112.','WOZ-grens in regeling â‚¬265.000; jaarlijkse indexering vereist actuele controle.']},'C',{legalBasis:['Huisvestingswet 2014'],effectiveFrom:'2024-11-01',effectiveTo:'2028-10-31'}),
 finding('almelo-vacancy-2020','GM0141',['vacancy-obligation'],'Leegstandverordening Binnenstad Gemeente Almelo 2020',sources.almeloVac,{method:'designated-area-attachment',conditions:['Alleen aangewezen niet-woningen in bijlage 1; leegmelding na zes maanden.']},'C',{legalBasis:['Leegstandwet'],effectiveFrom:'2020-04-01'}),
 finding('almere-hvv-2024','GM0034',['housing-permit','purchase-protection'],'Huisvestingsverordening Almere 2024',sources.almere,{method:'whole-municipality-and-value',conditions:['Opkoopbescherming gemeentebreed, WOZ lager dan actuele NHG-grens en aanvullende eigendoms-/gebruikseisen.']},'B',{legalBasis:['Huisvestingswet 2014'],requiredDocuments:['Eigendomsbewijs â€” Zelf aanleveren','Bewijs uitzonderingsgrond â€” Zelf aanleveren']})
];
const unresolved = {
 'GM1680':['Geen actuele officiÃ«le implementatiebron gevonden; bron-/registercontrole door tweede onderzoeker vereist voordat een negatieve conclusie mogelijk is.'],
 'GM0059':['Bepaal of de ontwikkelingsgebonden verhuurmelding als aanvullende taxonomiecategorie moet worden opgenomen.'],
 'GM0482':['Controleer het exacte actuele toepassingsbereik en de aanvraagroute van CVDR741471.'],
 'GM0613':['Bepaal of de ontwikkelingsgebonden verhuurmelding in de publieke woningcheck thuishoort.'],
 'GM0141':['Bevestig de geÃ¯ndexeerde WOZ-grens voor 2026 en digitaliseer/vergelijk bijlage 1 van de leegstandverordening.'],
 'GM0484':['Geen actuele officiÃ«le implementatiebron gevonden; controleer regionale en gemeentelijke registers handmatig voordat een negatieve conclusie mogelijk is.']
};
const batch = {schemaVersion:'1.0.0',batchId:'batch-001',startedAt:date,completedAt:date,selectionRule:'Eerste tien not-started records in bestaande research-status-volgorde',municipalities:municipalities.map(([code,name,province,street,postcode,locality])=>({municipalityCode:code,municipalityName:name,province,researchedPermitTypes:taxonomy,addressTests:[{street,postcode,locality,officialMunicipalityCode:code,result:'municipality-code-match',source:'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free'}],reviewLevel: unresolved[code] ? 'C' : (findings.some(f=>f.municipalityCode===code&&f.reviewLevel==='B')?'B':'A'),unresolvedQuestions:unresolved[code]||[]})),findings,absencePolicy:'not-found is not treated as no-current-regulation',publicDecisionRecordsAdded:0};
fs.mkdirSync('data/research-batches',{recursive:true}); write('data/research-batches/batch-001.json',batch);

const rs=read('data/research-status.json');
for(const [code] of municipalities){const r=rs.records.find(x=>x.municipalityCode===code); if(!r||r.researchStatus!=='not-started') throw new Error(`Selection invariant failed ${code}`); const local=findings.filter(f=>f.municipalityCode===code); Object.assign(r,{researchStatus:unresolved[code]?'source-review':'partially-verified',researchStartedAt:date,researchCompletedAt:date,lastCheckedAt:date,nextReviewAt:'2027-02-09',researchedPermitTypes:taxonomy,unresolvedQuestions:unresolved[code]||[],conflicts:[],sourceCount:new Set(local.map(f=>f.officialRegulationUrl)).size,notes:'Batch 001: officiÃ«le bronnen onderzocht; geen publieke beslisregel toegevoegd zonder volledige toepassings- en routeverificatie.'});}
write('data/research-status.json',rs);

const rq=read('data/review-queue.json');
const reviewItems=[
 ['batch001-aa-en-hunze-source','GM1680',null,'source-completeness','OfficiÃ«le zoekronde leverde geen actuele implementatieregeling op. Controleer het gemeentelijke regelingenregister en officiÃ«le bekendmakingen opnieuw; vraag: is er op 9 augustus 2026 een actuele regeling binnen de taxonomie?','high'],
 ['batch001-achtkarspelen-taxonomy','GM0059','achtkarspelen-target-groups-2023','taxonomy','CVDR705002 bevat een ontwikkelingsgebonden verhuurmelding. Vraag: is dit een legitieme extra categorie voor een bestaande-woningcheck of uitsluitend een plan-/ontwikkelaarsplicht?','medium'],
 ['batch001-alblasserdam-scope-route','GM0482','alblasserdam-hvv-2025','legal-and-source','Controleer in CVDR741471 welke woonruimte exact is aangewezen en bevestig de gemeentelijke aanvraagroute; beide ontbreken nog voor een veilige adresbeslissing.','high'],
 ['batch001-albrandswaard-taxonomy','GM0613','albrandswaard-rental-notification-2021','taxonomy','CVDR660521 bevat een meldplicht tijdens een instandhoudingstermijn. Vraag: hoort deze ontwikkelingsgebonden plicht in de gebruikersgerichte taxonomie?','medium'],
 ['batch001-almelo-index-map','GM0141','almelo-purchase-protection-2024','legal-and-gis','Artikel 3 indexeert de â‚¬265.000-grens jaarlijks en de leegstandbijlage gebruikt een aangewezen gebied. Bevestig het bedrag voor 2026 en controleer de officiÃ«le bijlage zonder ruimtelijke benadering.','high'],
 ['batch001-alphen-source','GM0484',null,'source-completeness','Alleen vervallen of niet-passende officiÃ«le resultaten gevonden. Controleer gemeentelijke en regionale registers; vraag: geldt op 9 augustus 2026 een actuele implementatieregeling binnen de taxonomie?','high']
].map(([id,municipalityCode,regulationId,category,reason,priority])=>({id,municipalityCode,regulationId,category,reason,status:'open',priority,createdAt:date}));
rq.items.push(...reviewItems); rq.generatedAt=date; write('data/review-queue.json',rq);

const ss=read('data/source-snapshots.json');
for(const f of findings){if(ss.snapshots.some(s=>s.url===f.officialRegulationUrl)) continue; ss.snapshots.push({id:`batch001-${f.id}`,url:f.officialRegulationUrl,finalUrl:f.officialRegulationUrl,httpStatus:null,automatedStatus:'scheduled-for-monitoring',lastCheckedAt:date,lastKnownModified:null,contentFingerprint:crypto.createHash('sha256').update(f.title+'|'+f.officialRegulationUrl+'|'+date).digest('hex')});}
ss.generatedAt=date; write('data/source-snapshots.json',ss);

console.log(`Applied batch 001: ${municipalities.length} municipalities, ${findings.length} findings, ${reviewItems.length} review items`);

