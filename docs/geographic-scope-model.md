# Municipality-specific geographic scope

Verified 2026-08-09. Legal geography is stored per regulation version, never per generic permit category.

## Model

A geographicScope is a versioned AND/OR tree. Leaf conditions support municipality, postcode/postcode-list, street/street-list, address-range, CBS district, CBS neighbourhood, municipal area, reviewed polygon, official map, property value and BAG property conditions. Every leaf requires municipality-specific official evidence. Missing or foreign evidence produces manual review, never a match.

Address facts come from BAG/PDOK and remain separate from geographic derivations. A polygon is evaluated only when controlled geometry is stored. A non-machine-readable official map returns manual-map-review-required. No postcode, neighbourhood or visual approximation is substituted.

## Current pilots

| Regulation | Authoritative method | Current machine state | Evidence |
|---|---|---|---|
| Den Haag opkoopbescherming | all neighbourhoods in Den Haag + property threshold | municipality match; property facts remain separate | CVDR698067 art. 5:27 |
| Emmen opkoopbescherming | four named municipal areas | partially verified; official area-to-boundary mapping still needed | CVDR698265 art. 2.1 |
| Leiden opkoopbescherming | whole municipality + property conditions | municipality match | CVDR711669 art. 7 |
| Leiden conversion | official legal map and quota material | manual GIS preparation required | CVDR711669 art. 2/map |
| Rotterdam opkoopbescherming | sixteen explicitly coded CBS neighbourhoods + property conditions | machine-readable CBS-neighbourhood match | CVDR741632 art. 2.6.1 |
| Rotterdam room rental | whole municipality, with excluded areas in appendix 2 and distance/property criteria | appendix needs controlled GIS preparation | CVDR741632 art. 2.2.1 and 2.2.3 |

## Review workflow

Store the official map and version, search for an official GIS equivalent, record an official-map-needs-gis-digitisation item, prepare geometry outside the consumer app, validate topology and sample addresses, obtain legal/GIS review, then publish immutable versioned geometry. Historical scope is superseded, not overwritten.

## Scale

The engine is code-ready for 342 municipalities. Legal geography is not data-ready nationwide: every municipality and regulation still requires independent evidence and review. Recommended research batch: 10 municipalities, with a second-person legal/GIS review before release.
