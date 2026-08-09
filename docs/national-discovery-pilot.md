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
