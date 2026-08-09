# Dataverantwoording

## Gemeenten

`data/municipalities-2026.json` is mechanisch afgeleid van het CBS-bestand **Gemeenten alfabetisch 2026** voor 1 januari 2026. Het bevat 342 unieke GM-codes met naam, provincie, referentiejaar en bron. Dit is de enige gemeentelijst die de applicatie gebruikt.

## Adressen

De browser zoekt postcode, huisnummer en optionele toevoeging in PDOK Locatieserver v3.1, gefilterd op BAG-adressen. Er is geen eigen postcodetabel. De werkende Locatieserver blijft voorlopig staan; migratie naar de OGC PDOK Location API vereist eerst mapping- en regressietests.

## Regelrecords

`data/regulations.json` kan gemeente, type, geografische scope, voorwaarden, uitzonderingen, officiële informatie-, aanvraag- en regelinglinks, CVDR/BWB/document-id, datums en notities vastleggen. Exacte adresbeslissingen worden niet gesuggereerd zonder officiële kaart- of straatgegevens.

## Twee onafhankelijke statussen

1. **Bronverificatie:** bestaat de URL, is de host officieel en is de publicatie actueel, toekomstig, verlopen, ingetrokken of conflicterend?
2. **Inhoudelijke/juridische review:** ondersteunt de officiële tekst de gemodelleerde conclusie, voorwaarden en uitzonderingen?

Een gevonden link keurt nooit automatisch de juridische uitleg goed. Conflicten krijgen `conflict — manual review required`.

## Bronregister en automatisering

`data/sources.json` koppelt bronnen aan gemeente en regeltype. `scripts/verify-sources.mjs` accepteert alleen bekende overheidsdomeinen, volgt redirects en meldt HTTP-fouten. Een netwerkfout bewijst geen intrekking; het script wijzigt daarom nooit zelfstandig een juridische status.

## Huidige beperking

De records voor Den Haag, Emmen, Leiden en Rotterdam zijn nog niet juridisch goedgekeurd. Ze vormen een controleerbare researchbasis, geen volledige adresbeslissing.

## Verificatie van aanvraagroutes

`officialApplicationUrl` wordt afzonderlijk beoordeeld en krijgt `separate-verified`, `same-as-info-verified` of `unresolved`. Een identieke informatie- en aanvraag-URL is alleen toegestaan wanneer de officiële pagina aantoonbaar zelf de aanvraag-ingang bevat. De verificatiedatum, benodigde documenten en directe formulierlinks worden per record bewaard. Bij `unresolved` toont de UI een niet-klikbare reviewstatus in plaats van een fictieve aanvraagknop.
