# Woningencheck.nl

Woningencheck.nl wordt een gestructureerde, officiële-bronnen-database voor Nederlandse regels en vergunningen rond woningen. De browserapp ondersteunt de beoogde keten: adres → BAG → gemeente → toepasselijke regelrecords → officiële bron en aanvraagroute.

## Principes

- Alleen CBS, BAG/Kadaster/PDOK, overheid.nl en officiële gemeentelijke publicaties zijn bron van waarheid.
- Automatische bronverificatie en inhoudelijke/juridische review zijn afzonderlijke statussen.
- Tegenstrijdige officiële informatie wordt niet stil opgelost, maar gemarkeerd voor handmatige review.
- Excel kan later als reviewartifact worden afgeleid, maar is nooit de productiedatabase. Er was bij aanvang geen registerwerkboek in de repository.

## Architectuur

- `index.html` — directe GitHub Pages-productiepagina, zonder redirect.
- `assets/app.js` — gemeenteselectie, weergave van regels en BAG-adreszoeking via PDOK Locatieserver v3.1.
- `data/municipalities-2026.json` — canonieke CBS-lijst van 342 gemeenten op 1 januari 2026.
- `data/regulations.json` — gemeentelijke regelrecords volgens het uitbreidbare model.
- `data/sources.json` — centraal bronregister.
- `data/permit-taxonomy.json` — centrale begrippentaxonomie met gemeentelijke aliasruimte.
- `data/research-status.json` — onderzoekwachtrij met exact 342 gemeentelijke onderzoekseenheden.
- `data/review-queue.json` — onafhankelijke wachtrij voor juridische, geografische en documentreview.
- `schemas/regulation.schema.json` — contractschema voor regelrecords.
- `schemas/evidence.schema.json`, `research-status.schema.json` en `review-item.schema.json` — pijplijncontracten.
- `scripts/verify-data.mjs` — deterministische dataset- en publicatiecontroles.
- `scripts/verify-sources.mjs` — netwerkcontrole voor toegestane officiële hosts; verandert geen juridische status.
- `scripts/build-research-pipeline.mjs` — reproduceerbare generatie/migratie van de onderzoek- en reviewwachtrij.

Meer details staan in [de dataverantwoording](docs/data-provenance.md).
De verplichte werkwijze staat in [de onderzoeksmethodologie](docs/research-methodology.md).

## Huidige dekking

De gemeentelijke basis is landelijk. De eerste, nog juridisch te beoordelen records betreffen Den Haag, Emmen, Leiden en Rotterdam. Een gemeente zonder records blijft selecteerbaar en toont eerlijk dat inhoudelijke dekking ontbreekt.

## Aanvraagroutes en documenten

Iedere regelkaart houdt drie functies apart: **Meer informatie**, **Officiële regeling** en de primaire CTA **Vergunning aanvragen**. Een CTA verschijnt alleen wanneer `officialApplicationUrl` is gecontroleerd. Identieke informatie- en aanvraag-URL's zijn uitsluitend toegestaan met `applicationUrlStatus: same-as-info-verified`; onopgeloste routes krijgen geen klikbare knop. `requiredDocuments` en `applicationDocuments` tonen vereisten en directe officiële formulieren in hetzelfde resultaat.

## Lokaal ontwikkelen

Er is geen buildstap. Start in de repositoryroot een lokale statische webserver, bijvoorbeeld `npx serve .`, en open het getoonde adres. Een server is nodig omdat browsers lokale JSON-`fetch` vanaf `file://` blokkeren.

Controleer wijzigingen met:

```text
node --check assets/app.js
node scripts/verify-data.mjs
node scripts/verify-sources.mjs   # vereist netwerk; fouten vragen menselijke beoordeling
```

## Deployment en domein

GitHub Pages hoort te publiceren uit `main`, map `/ (root)`. `CNAME` bevat exact `woningencheck.nl`. Configureer bij GoDaddy het apexdomein met de vier door GitHub gepubliceerde A-records (en optioneel alle vier AAAA-records) en `www` als CNAME naar `vid567.github.io`. Verwijder conflicterende records, wacht op DNS/certificaatuitgifte en schakel daarna **Enforce HTTPS** in. Claim propagatie pas na DNS- en HTTP-tests.

## Disclaimer

Woningencheck.nl is een informatie- en onderzoekstool. Regels veranderen en adresomstandigheden kunnen het antwoord beïnvloeden. Raadpleeg vóór handelen altijd de gelinkte officiële instantie; de website vervangt geen juridisch advies of formeel gemeentelijk besluit.


Address-specific architecture and source feasibility: [docs/address-data-source-analysis.md](docs/address-data-source-analysis.md).

- [Geografisch scopemodel](docs/geographic-scope-model.md)
