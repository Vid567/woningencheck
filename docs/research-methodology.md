# Onderzoeksmethodologie Woningencheck.nl

## Doel en bewijsregel

Iedere gebruikersclaim moet terug te voeren zijn op officiële documentatie. Zoekmachines mogen bronnen vinden, maar zijn geen bewijs. Een mislukte zoekactie betekent **niet gevonden** of **onderzoek onvolledig**, nooit automatisch **niet van toepassing**.

## Bronhiërarchie

1. `wetten.overheid.nl`
2. `lokaleregelgeving.overheid.nl`
3. `officielebekendmakingen.nl`
4. officiële gemeentelijke websites
5. officiële gemeentelijke aanvraagportalen en formulieren
6. Omgevingsloket en andere officiële overheidsportalen
7. overige officiële registers

Commerciële websites, blogs, nieuws, sociale media en AI-samenvattingen zijn geen juridisch bewijs.

## Vaste onderzoekseenheid

Iedere CBS-gemeente staat exact eenmaal in `data/research-status.json`. Status is meerwaardig: `not-started`, `in-research`, `source-review`, `legal-review-required`, `verified`, `partially-verified`, `conflict` of `recheck-required`. Planning, onderzochte taxonomietypen, open vragen, conflicten en bronaantal blijven hierdoor zichtbaar.

## Verplichte procedure per gemeente

1. Bevestig GM-code, naam en provincie tegen `municipalities-2026.json`.
2. Zoek Huisvestingsverordeningen, verhuurverordeningen, APV-bepalingen waar relevant, beleidsregels, nadere regels, aanwijzings- en wijzigingsbesluiten, kaarten en bijlagen.
3. Controleer publicatie, inwerkingtreding, verval, intrekking, wijzigingen en opvolgers.
4. Modelleer geografische scope afzonderlijk: gemeente, wijk, buurt, straat, postcode, adresreeks, kaartgebied, objectcategorie of waardegrens.
5. Neem uitsluitend officieel ondersteunde voorwaarden en uitzonderingen over.
6. Scheid informatie-, aanvraag- en regelings-URL. Een gelijke info/aanvraag-URL vereist `same-as-info-verified`.
7. Modelleer vereiste documenten. Zonder officiële downloadlink wordt een gebruikersdocument als `user-supplied-document` / **Zelf aanleveren** behandeld.
8. Bewaar directe officiële formulieren, templates en instructies.
9. Leg CVDR/BWB/publicatie-id, titel, artikel en bijlage vast wanneer beschikbaar.
10. Voeg per belangrijke claim evidence toe en plaats onzekerheden in `review-queue.json`.

## Taxonomie

`data/permit-taxonomy.json` standaardiseert concepten, terwijl `municipalName` de officiële gemeentelijke term bewaart. Een taxonomietype bewijst niet dat de vergunning in een gemeente geldt; het definieert alleen de onderzoekscategorie.

## Evidence

Evidence bevat claim, officieel brontype, URL, identifier, artikel/sectie, verificatiedatum en optionele contentfingerprint. Eén algemeen informatieadres mag niet stil alle afzonderlijke claims bewijzen. Meerdere bronnen per record zijn toegestaan en vaak noodzakelijk.

## Verificatielagen

De lagen zijn onafhankelijk:

1. URL bereikbaar
2. officiële bron
3. inhoud ondersteunt claim
4. actuele geldigheid
5. aanvraagroute actief en passend
6. documenten gecontroleerd
7. handmatige juridische review

Automatisering mag laag 7 nooit zelfstandig voltooien.

## Conflicten

Bij strijd tussen officiële bronnen worden beide claims, bronnen, datums en de reden vastgelegd. Status wordt `conflict — manual review required`. De onzekere conclusie wordt niet als vaststaand aan gebruikers getoond. Andere gemeenten blijven ondertussen onderzoekbaar.

## Tijdversies

Records bewaren `validFrom`, `validUntil`, `supersededBy`, `previousVersion` en `lastCheckedAt`. Een nieuwe versie vervangt bewijs niet destructief. De productiecheck kiest uiteindelijk alleen een op de controledatum toepasselijke versie.

## Link- en wijzigingscontrole

Automatisering controleert HTTPS, officiële host, redirects, statuscodes, CVDR-, document- en aanvraaglinks en duplicaten. HTTP 403 van een officieel domein kan `automated-check-blocked` betekenen. Toekomstige harvesters kunnen `lastKnownModified` en een hash vullen; een wijziging resulteert in `source changed — recheck required`, niet in een automatische juridische herschrijving.

## Review- en updatecyclus

De onderzoekwachtrij bepaalt de volgende gemeente; de reviewwachtrij bevat juridische uitleg, kaarten, conflicten, datums en documenten die menselijke aandacht vragen. `nextReviewAt`, dode links, gewijzigde fingerprints en gewijzigde regelingversies maken records opnieuw controleplichtig.

## Automatiseringsgrenzen

Automatisering mag officiële kandidaten vinden, links en ids controleren, datums detecteren en reviewrecords voorbereiden. Zij mag geen afwezigheid afleiden, geen conflict oplossen, geen regels kopiëren tussen gemeenten en geen juridische goedkeuring zetten.
