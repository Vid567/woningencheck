# Batch 004 — Hybride discovery en verificatie

Discovery is geen juridische verificatie. Geen kandidaat is gepubliceerd.

| Gemeente | Discovery | Tier | Regels gevonden | Verificatie | Menselijke controle |
| -------- | --------- | ---- | --------------: | ----------- | ------------------: |
| Beekdaelen | afgerond | 5 | 0 | source-incomplete | 0 |
| Beesel | afgerond | 5 | 0 | source-incomplete | 0 |
| Berg en Dal | afgerond | 5 | 0 | source-incomplete | 0 |
| Bergeijk | afgerond | 5 | 0 | source-incomplete | 0 |
| Bergen (L.) | afgerond | 5 | 0 | source-incomplete | 0 |
| Bergen (NH.) | afgerond | 5 | 0 | source-incomplete | 0 |
| Bergen op Zoom | afgerond | 5 | 0 | source-incomplete | 0 |
| Berkelland | afgerond | 5 | 0 | source-incomplete | 0 |
| Bernheze | afgerond | 5 | 0 | source-incomplete | 0 |
| Best | afgerond | 5 | 0 | source-incomplete | 0 |
| Beuningen | afgerond | 5 | 0 | source-incomplete | 0 |
| Beverwijk | afgerond | 5 | 0 | source-incomplete | 0 |
| De Bilt | afgerond | 5 | 0 | source-incomplete | 0 |
| Bladel | afgerond | 5 | 0 | source-incomplete | 0 |
| Blaricum | afgerond | 5 | 0 | source-incomplete | 0 |
| Bloemendaal | afgerond | 5 | 0 | source-incomplete | 0 |
| Bodegraven-Reeuwijk | afgerond | 5 | 0 | source-incomplete | 0 |
| Boekel | afgerond | 5 | 0 | source-incomplete | 0 |
| Borger-Odoorn | afgerond | 5 | 0 | source-incomplete | 0 |
| Borne | afgerond | 5 | 0 | source-incomplete | 0 |
| Borsele | afgerond | 5 | 0 | source-incomplete | 0 |
| Boxtel | afgerond | 5 | 0 | source-incomplete | 0 |
| Breda | afgerond | 5 | 0 | source-incomplete | 0 |
| Bronckhorst | afgerond | 5 | 0 | source-incomplete | 0 |
| Brummen | afgerond | 5 | 0 | source-incomplete | 0 |

## Uitkomst

Tier 5: 25; geverifieerde bevindingen, routes, documenten, dynamische parameters, adrestests en nieuwe publieke regels: 0. Dit is geen conclusie dat regels ontbreken. Er waren geen gemeente-specifieke GIS- of juridische bevindingen, omdat inhoudelijke verificatie niet is bereikt.

## Systemische blokkade

De discovery-index bevat uitsluitend eerder onderzochte bronnen. Website- en GIS-adapters kunnen daardoor bij onbekende gemeenten geen officiële ingang vinden. De officiële-publicatiezoeking gaf HTTP 200, maar de huidige parser leverde geen betrouwbare kandidaten.

## Prestatie

Cold-cache 992 ms; warm-cache niet gemeten; 75 verzoeken; 0 cachehits; 0 retries; 0 errors; maximaal 5 gelijktijdig; gemiddeld 177.12 ms; mediaan 105 ms; traagste Beesel (533 ms).

## Besluit

**REDUCE OR PAUSE ACCELERATED DISCOVERY** totdat officiële domein- en GIS-catalogusbootstrap voor onbekende gemeenten live is gevalideerd.
