# Address-specific applicability: feasibility and architecture

Checked 2026-08-09. Official sources only.

## Flow before this pilot

PDOK address lookup matched the municipality, then every record with that municipality code was rendered. `scopeType`, `scopeValue`, value limits and prose conditions did not filter cards. There was no structured context, question engine or applicability state.

## Source capability matrix

| Source | Authority | Capability | Production assessment |
|---|---|---|---|
| BAG OGC API / Locatieserver | Kadaster/PDOK | Address, IDs, coordinates, municipality, neighbourhood/district, use, area, status, year; open API, Public Domain Mark 1.0 | Safe and practical now; cache/proxy at scale |
| DSO open stelsel | BZK/DSO-LV | Location-specific Omgevingswet rules and activities; official APIs | API key and fair use; useful later, not a replacement for Housing Act/CVDR rules |
| WOZ-waardeloket | Waarderingskamer | Manual public residential value display | Automated/mass extraction prohibited; never scrape, ask user |
| LV WOZ services | Waarderingskamer | Services for authorised recipients | Purpose-bound and not public; unavailable now |
| BRK | Kadaster | Parcels, rights, ownership/acquisition products | Paid/restricted and personal; exclude from public checker |
| BRP | RvIG/municipalities | Resident/household data | Not public; never query resident identity, count or household |
| CBS/PDOK boundaries | CBS/PDOK | Official neighbourhood/district geometry | Open; recommended for reviewed spatial joins |
| CVDR / municipal GIS | KOOP/municipality | Legal articles, lists, maps and sometimes GIS | Primary evidence; raster maps need controlled GIS preparation |

References: [BAG](https://api.pdok.nl/kadaster/bag/ogc/v2?f=html&lang=nl), [DSO](https://iplo.nl/digitaal-stelsel/aansluiten/open-data-api/), [WOZ](https://www.waarderingskamer.nl/woz-wijzer/controleren-woz-waarde/woz-waardeloket), [BRK](https://www.kadaster.nl/zakelijk/producten/eigendom/aanvragen-brk-levering), [BRP](https://www.rvig.nl/basisregistratie-personen).

## Automatic versus user facts

Automatic now: address, municipality code, street/postcode/number, coordinates, BAG ID, neighbourhood/district and lawful object characteristics. Reviewed lists/polygons can be joined. Not automatic: acquisition date, WOZ at acquisition, rental duration at transfer, intended use, owner occupancy, family relation, occupants or household composition. Official facts, user answers and inference remain separate; conditions declare their source and evidence.

## Leiden pilot

The [current regulation](https://lokaleregelgeving.overheid.nl/CVDR711669) is version 4, effective 11 July 2025. Article 7 makes opkoopbescherming municipality-wide only when WOZ at transfer, transfer date and rental-at-transfer requirements are met. Public address APIs cannot establish these facts.

Article 2 limits conversion/forming permits to the legal map. The appendix names De Waard in the 25% area. BAG identifies Carneoolstraat 112 as Hoge Mors and Trompstraat 51 as De Waard. Manual review of the official raster confirms Hoge Mors outside and De Waard inside. No polygon was approximated.

- Carneoolstraat 112: opkoopbescherming needs user facts; conversion permit geographic no-match.
- Trompstraat 51: opkoopbescherming needs user facts; conversion permit geographic match, then asks about intended shared non-household occupation. Current occupancy is never inferred.

## Architecture decision

Static GitHub Pages is sufficient for this pilot: public CORS address data, local evaluation and no secrets. Nationwide use should add scheduled GIS/data ingestion and immutable source versions. Add a serverless proxy/cache for DSO keys, rate limits and monitoring. Add a spatial database only when reviewed temporal polygons outgrow static files. BRP and personal BRK data remain out of scope regardless of backend.

