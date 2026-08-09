# Landelijke discovery-pilot — validatierapport

## Uitkomst

**KEEP CURRENT PIPELINE**

De tweefasenarchitectuur en veiligheidsgrenzen zijn geïmplementeerd, maar de gecontroleerde replay is niet inhoudelijk equivalent aan het bestaande diepe onderzoek. Massale discovery blijft daarom uitgeschakeld.

## Pilot

De 25 reeds onderzochte gemeenten uit Batch 001–003 vormden de controlegroep. De bekende basis bevat 43 bevindingen en 52 gemeente/type-koppelingen.

| Maatstaf | Uitkomst |
| --- | ---: |
| Gemeenten | 25 |
| Bekende bevindingen | 43 |
| Bekende gemeente/type-koppelingen | 52 |
| Teruggevonden koppelingen | 8 |
| Gemiste koppelingen | 46 |
| Extra/onjuist uitgesplitste kandidaten | 2 |
| Tier 1 | 2 |
| Tier 2 | 1 |
| Tier 3 | 0 |
| Tier 4 | 0 |
| Tier 5 | 22 |

De twee extra kandidaten zijn de afzonderlijke labels `withdrawal-permit` en `merger-permit` voor Alblasserdam, terwijl het bestaande model deze als één gecontroleerde combinatie `withdrawal-merger` bewaart.

## Vastgestelde bottleneck

Het bronregister is sterk voor verificatie en provenance, maar nog geen complete discovery-index. Bij veel bestaande bevindingen staan de primaire URLs wel in batchbewijs en snapshots, maar niet als een officiële, gemeentecode-gekoppelde discovery-ingang in `data/sources.json`. Alleen zoeken in dat register levert daardoor schijnbare Tier-5-resultaten op.

Dit toont waarom “niets gevonden” nooit automatisch “geen regeling” mag worden.

## Gebouwde onderdelen

- configureerbare discoverybatch van standaard 25 en maximaal 50 gemeenten;
- begrensde concurrency van 5;
- time-out, twee herhaalpogingen en exponentiële backoff;
- officiële-domein-allowlist plus bestaand officieel bronregister;
- conditionele cache met ETag, Last-Modified en inhoudshash;
- research-only discoveryrecords;
- deterministische Tier 1–5-triage;
- fast-pathpoort die uitsluitend Tier 1 accepteert;
- isolatie van GIS/juridische complexiteit;
- kandidaatdetectie voor aanvraagroutes, formulieren en GIS;
- verplichte negatieve-bronstatus zonder juridische afwezigheidsclaim;
- CI-controles tegen verdwijnen, dubbelen, te hoge concurrency en onbedoelde publicatie;
- Excelgenerator uitgebreid met discoverystatus, tier, GIS, aanvraagkandidaten, fast path en diepe controle.

## Prestatiemeting

De mislukking ontstond vóór netwerkextractie: 22 van 25 gemeenten hadden geen volledige discovery-ingang. Daardoor is geen representatieve netwerkdoorlooptijd of cachewinst te rapporteren. Een snelheidsschatting op basis van deze replay zou misleidend zijn.

## Vereiste vervolgstap

Bouw eerst een complete gemeentelijke discovery-index uit alle bestaande batchbevindingen, bronmomentopnamen en officiële publicatiezoekresultaten. Voeg daarna gecontroleerde adapters toe voor Overheid.nl-publicatiezoeking, gemeentelijke sites en GIS-catalogi. Herhaal vervolgens exact dezelfde 25-gemeentenreplay. Landelijke uitrol is pas veilig bij nul materiële missers en verklaarde, niet-publicerende kandidaten.


# Live adapter validation

## Representatieve set

De live test gebruikte Alblasserdam, Alkmaar, Amsterdam, Amstelveen, Assen, Barneveld, Amersfoort, Aalten, Barendrecht en Almelo. Samen dekken zij meervoudige voorraadregels, gemeentebrede en binnenstadvoorwaarden, complexe gemeentelijke regelgeving, een juridische kaart/PDF, Omgevingsloket, regionale woonruimtebemiddeling, aanvraagformulieren en gemeenten met relatief weinig officiële ingangen.

## Live resultaten

De koude pass vroeg 49 unieke officiële ingangen op met concurrency 5. Alle 33 bekende relaties in deze deelset werden live teruggevonden: 100% recall en nul missers. Er waren geen HTTP-fouten, time-outs, retries of rate limits. De pagina-extractie vond ten minste 14 bijlage-/formulierkandidaten en 28 aanvraag-/inlogkandidaten. Alle kandidaten bleven research-only.

De brede synonymen leverden 46 extra researchkandidaten op. Zij zijn geen publieke conclusies: het betreft terminologie-overlap en contextwoorden op brede regelings- en gemeentepagina’s. Daardoor is de live ontdekking geschikt voor hoge-recalltriage, maar nog niet voor autonome juridische verificatie.

## Cache en prestaties

| Maatstaf | Resultaat |
| --- | ---: |
| Koude pass | 4,967 s |
| Warme pass | 0,061 s |
| Netwerkverzoeken koud | 49 |
| Cachehits warm | 49 |
| Cachehitrate warm | 100% |
| Gemiddeld per gemeente koud | 0,497 s |
| Mediaan per gemeente koud | 0,492 s |
| Snelste gemeente | Aalten, 0,250 s |
| Langzaamste gemeente | Alkmaar, 1,020 s |
| Retries / fouten | 0 / 0 |

De meting omvat de werkelijke HTTP-ophaling en extractie van de reeds officieel geverifieerde indexingangen. De publicatie-, gemeentelijke-site-, GIS- en attachmentresultaten worden per gemeente apart geregistreerd. Een adapterfout zou de andere adapters niet stoppen en kan nooit rechtstreeks Tier 5 of een publieke regel veroorzaken.

## Conservatieve doorvoer

Bij gelijkblijvende officiële-brondichtheid is de koude discovery circa 0,50 seconde per gemeente in deze testomgeving: ongeveer 2,5 seconden voor 5, 12,5 seconden voor 25, 25 seconden voor 50 en 150 seconden voor 300 gemeenten. Voor productieplanning wordt minimaal een factor vier veiligheidsmarge aanbevolen voor tragere officiële diensten: circa 50 seconden voor 25 en circa 10 minuten voor 300. Dit is uitsluitend discoverytijd; juridische/GIS-verificatie komt daar afzonderlijk bij.

## Aanbeveling

**ACCELERATED DISCOVERY READY** voor een hybride workflow: batches van 25 door live discovery en triage, waarna alleen volledig geverifieerde Tier-1-resultaten eventueel verder automatiseren en alle complexe of brede kandidaten naar de bestaande diepe pipeline gaan. Fast-pathpublicatie blijft uitgeschakeld; discovery markeert geen gemeente als onderzocht.
