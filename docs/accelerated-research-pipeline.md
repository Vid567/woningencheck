# Versnelde landelijke onderzoekspijplijn

## Hoofdregel

De pijplijn automatiseert herhaalbaar bronwerk, niet de juridische beoordeling. Ontdekkingen blijven onderzoeksgegevens totdat alle bestaande verificatiepoorten slagen.

## Fase A — ontdekking en triage

Een configureerbare batch bevat standaard 25 en maximaal 50 gemeenten. Onafhankelijke bronverzoeken gebruiken begrensde gelijktijdigheid, time-outs, conditionele HTTP-controle en exponentiële wachttijd. De selectie gebruikt gemeentenaam én gemeentecode.

Per gemeente worden officiële regelingen, mogelijke vergunningtypen, informatie- en aanvraagpagina’s, formulieren, GIS-diensten, kaarten, jaarwaarden, gecontroleerde bronklassen en open vragen vastgelegd. Ieder record heeft `evidencePublicationStatus: research-only`.

De cache bewaart URL, uiteindelijke URL, HTTP-status, ETag, Last-Modified, inhoudshash en controledatum. Onveranderde bronnen worden hergebruikt; een gewijzigde hash verplicht hercontrole.

## Triage

- Tier 1 — Straightforward: actuele officiële regeling, eenvoudige geografie, expliciete voorwaarden, relevante route en geen conflict.
- Tier 2 — Moderate: extra parameter-, aanvraag- of documentcontrole nodig.
- Tier 3 — GIS complex: kaart, polygoon, afstand of ontbrekende machineleesbare laag.
- Tier 4 — Legal review: officiële bronnen conflicteren of interpretatie is wezenlijk ambigu.
- Tier 5 — Source incomplete: onvoldoende actuele implementatiebron; nooit automatisch “geen regeling”.

## Fast path

Alleen Tier 1 kan doorstromen. Currentness, bewijs, geografie, aanvraagroute, documenten, adrestest, privacy, gewone taal en bestaande schema- en QA-controles blijven verplicht. Het systeem kent nooit zelfstandig inhoudelijke menselijke juridische goedkeuring toe.

## Slow path

Tier 3 en 4 gaan naar de bestaande reviewarchitectuur. Alleen de onzekere regel wordt geïsoleerd. Tier 2 en 5 gaan naar gerichte diepe verificatie; andere gemeenten blijven doorlopen.

## Officiële bronnen

Vaste overheidsdomeinen zijn toegestaan. Andere gemeentelijke of regionale domeinen moeten al officieel goedgekeurd zijn in het bronregister. Formulieren worden uitsluitend aan een specifieke gemeente, regeling en aanvraagroute gekoppeld.

## Excel

De gestructureerde database blijft leidend. Excel wordt gegenereerd na een complete ontdekkingsbatch, na afsluiting van diepe verificatie of op verzoek — niet meer na iedere vijf ontdekkingen.
