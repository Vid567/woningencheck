# Batch 002 — Samenvatting

| Gemeente | Regels gevonden | Automatisch bevestigd | Steekproef | Menselijke controle |
| -------- | --------------: | --------------------: | ---------: | ------------------: |
| Alphen-Chaam | 0 | 1 negatieve-bronuitkomst | 0 | 0 |
| Altena | 1 | 0 | 1 | 0 |
| Ameland | 2 | 2 | 0 | 0 |
| Amersfoort | 2 | 1 | 1 | 0 |
| Amstelveen | 3 | 1 | 1 | 1 |
| Amsterdam | 6 | 3 | 3 | 0 |
| Apeldoorn | 1 | 1 | 0 | 0 |
| Arnhem | 4 | 2 | 2 | 0 |
| Assen | 1 | 0 | 0 | 1 |
| Asten | 1 | 1 | 0 | 0 |

Precies de eerste tien nog niet gestarte gemeenten uit de vaste wachtrij zijn onderzocht. Batch 003 is niet gestart. Er zijn 21 bevindingen vastgelegd. Er zijn geen publieke beslisregels toegevoegd: de meeste nieuwe regels vereisen naast het adres ook activiteit, doelgroep, huur/WOZ, aankoopdatum, bewonersaantal of projectkenmerken.

## Onderzoeksmethode en negatieve conclusie

Alle conclusies gebruiken officiële regelgeving, gemeentelijke dienstenpagina's, formulieren en het Omgevingsloket. Voor Alphen-Chaam is na systematische register- en gemeentelijke broncontrole geen actuele lokale implementatie binnen de bestaande Woningencheck-taxonomie bevestigd. Dit betekent niet dat geen andere woon- of omgevingsregel geldt.

## Geografie

Aangetroffen methoden zijn: gehele gemeente, gehele gemeente plus prijs/object/doelgroep/bewoning, project- en locatiespecifiek, afstand tot verleende vergunningen en een officiële kaartbijlage. Er is geen juridische geografie naar postcodes vertaald. De Amstelveense 50-meterregel en de Assense bijlagecontour blijven gericht open.

## Adrestesten

Via de officiële landelijke adresservice zijn openbare adressen getest in alle tien gemeenten: Willibrordplein 1 Alphen, Sportlaan 170 Almkerk, Jelmeraweg 1 Ballum, Stadhuisplein 1 Amersfoort, Laan Nieuwer-Amstel 1A Amstelveen, Amstel 312A-1 Amsterdam, Marktplein 20A-1 Apeldoorn, Koningstraat 38 Arnhem, Noordersingel 33 Assen en Koningsplein 3a Asten. Alle antwoorden bevatten de verwachte officiële gemeentecode. Er zijn geen bewonersgegevens geraadpleegd.

## Diepe QA-steekproeven

**Eenvoudig — Ameland.** Gemeentepagina en actuele verordening zijn naast elkaar gelegd. De woningcategorieën, 2026-grenzen, binding, dertien weken vruchteloze aanbieding, opkooptermijn, familiegrond, aanvraagroutes en documenten sluiten aan. De bedragen zijn als jaarwaarden beheerd.

**Complex — Amsterdam.** De actuele verordening is vergeleken met afzonderlijke gemeentelijke routes voor woonruimteverdeling, woningvoorraadwijziging, kamerverhuur, woningvorming, vakantieverhuur en opkoopbescherming. De steekproef bevestigt dat één algemene Amsterdam-regel onveilig zou zijn; activiteit, woningkenmerken, waarde, bewoning en uitzonderingen moeten afzonderlijk worden uitgevraagd. Daarom zijn onderzoeksbevindingen vastgelegd zonder te brede publieke activering.

# Alleen door u te controleren

**Gemeente:** Amstelveen  
**Onderwerp:** 50-meterregel bij kamergewijze verhuur  
**Waarom controle nodig is:** automatische toepassing vereist een volledige actuele lijst of laag met reeds verleende kamerverhuurvergunningen.  
**Officiële bron:** https://www.amstelveen.nl/woningdelen  
**Wat moet u controleren:** of de gemeente een officiële machineleesbare vergunningenlaag of registerexport kan leveren.  
**Aanbevolen actie:** vraag de dataset op; activeer de afstandstoets pas na volledigheidscontrole.

**Gemeente:** Assen  
**Onderwerp:** contour voor woningdelen en kamerverhuur in bijlage 1  
**Waarom controle nodig is:** de juridische contour is als officiële kaartbijlage beschikbaar, maar geen machineleesbare equivalent is bevestigd.  
**Officiële bron:** https://lokaleregelgeving.overheid.nl/CVDR750864  
**Wat moet u controleren:** of een officiële GIS-laag bestaat; zo niet, laat de contour exact digitaliseren en onafhankelijk valideren.  
**Aanbevolen actie:** geen postcodebenadering gebruiken en adresbeslissing geblokkeerd houden tot GIS-validatie.

## Besluit

Batch 002 is technisch verwerkt, maar bevat twee gerichte eigenaarspunten. Eindadvies: **DO NOT START BATCH 003** totdat de Amstelveense vergunningenafstand en Assense juridische contour zijn opgelost.
