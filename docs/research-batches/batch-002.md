# Batch 002 — Afsluiting

Batch 002 is afgesloten zonder Batch 003 te starten.

## Uitkomst

- Oorspronkelijk open: **13**
- Objectief afgehandeld: **11**
- Resterend: **2**
- Release-/batchblokkers: **0**
- Gemeentespecifieke blokkers: **2**
- Niet-blokkerende reviews: **0**

De zes generieke juridische-goedkeuringsitems zijn gesloten: officiële regelgeving en gemeentelijke uitleg zijn opnieuw beoordeeld, terwijl publieke regels voorzichtig en niet-conclusief blijven. De drie documentenitems zijn gesloten na controle van de actuele officiële aanvraagroutes; situatieafhankelijke bijlagen blijven herkenbaar als conditioneel. De Leidse en Rotterdamse kaartitems zijn veilig beperkt tot een niet-definitieve adresuitkomst en behoeven geen blijvende algemene werktaak.

## Amstelveen

De gemeentelijke pagina beschrijft de 50-meterregel. De officiële oudere uitvoeringsregel definieert de afstand als gemeten vanuit het midden van de voorgevel. In de officiële gemeentelijke kaartviewer is de dataset **Kamergewijze verhuur** gevonden: 247 punten, EPSG:28992, bronstatus `onGoing`, brondatum 19 mei 2025. De publicatie bevestigt echter niet dat ieder punt het midden van de voorgevel is. Daarom is de laag niet voor een juridisch definitieve afstandsberekening geactiveerd. Er zijn geen adresspecifieke afstandstests gerapporteerd: dat zou schijnzekerheid geven.

## Assen

Artikel 5 van de actuele Beleidsregels woningsplitsing en woningdelen verwijst naar bijlage 1. De officiële contourkaart is gevonden, maar is een niet-gegeorefereerde JPEG. In officiële gemeentelijke GIS- en publicatiebronnen is geen juridisch equivalente machineleesbare laag bevestigd. De kaart kent complexe grenzen en uitsluitingen; gecontroleerde digitalisering is zonder georeferentie en juridische grensankers niet verantwoord. Er is dus geen afgeleide geometrie gemaakt.

## Algemene architectuur

Beide patronen zijn generiek vastgelegd in `data/batch-002-geographic-scopes.json`: `distance-to-official-feature` en `legal-map-contour`, met verplichte herkomst, versie, meetmethode, automatiseringsstatus en een expliciete quarantaine. Onbevestigde geometrie kan geen definitieve publieke beslissing produceren. Postcodebenadering en gemeente-overstijgende hergebruik zijn uitgesloten. De QA controleert deze waarborgen.

## Dynamische parameters

Alle 11 jaarwaarden bevatten waarde, jaar, geldigheid, bron, verificatiedatum, verwachte update en status. Tien zijn actueel voor 2026. De enige 2025-referentiewaarde is gemarkeerd `expired-do-not-use` en kan niet aan een actuele beslissing deelnemen.

## Besluit

De twee resterende vragen raken alleen de publicatie van hun specifieke gemeentelijke geografische regel. Het onderzoeksmodel kan dezelfde patronen in latere gemeenten veilig vastleggen en in quarantaine houden.

Eindadvies: **READY FOR BATCH 003**. Batch 003 is niet gestart.
