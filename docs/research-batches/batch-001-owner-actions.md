# Batch 001 — eigenaarstaken

## 1. Alblasserdam — toepassing en aanvraagroute

- Status: menselijke juridische controle vereist.
- Controleer welke onderdelen van de Huisvestingsverordening Gemeente Alblasserdam 2025 voor een gewoon woonadres gelden.
- Bevestig op een actuele officiële gemeentepagina waar de gebruiker de bijbehorende vergunning aanvraagt.
- Activeer pas daarna een publieke regel of aanvraagknop.
- Bronnen: https://lokaleregelgeving.overheid.nl/CVDR741471 en https://raad.alblasserdam.nl/Documenten/Huisvestingsverordening-2025-DROP-getekend.pdf

## 2. Almelo — officiële leegstandsgrens

- Status: handmatige GIS-/bijlagecontrole vereist.
- De officiële ArcGIS-laag voor opkoopbescherming is gevonden en machineleesbaar verwerkt.
- Voor de leegstandsverordening ontbreekt nog een officiële machineleesbare grens van de binnenstad/bijlage 1.
- Digitaliseer de juridische grens uitsluitend aan de hand van de officiële bijlage; gebruik geen postcodebenadering.
- Bronnen: https://lokaleregelgeving.overheid.nl/CVDR638723 en https://www.almelo.nl/wonen-bouwen-en-verbouwen/leegstandsverordening

## 3. Aalten — conflict tussen regeling en dienstenpagina

- Status: inhoudelijke juridische beslissing vereist.
- Artikel 2 van CVDR720987 formuleert de vergunningplicht breed voor verblijfsruimte; de gemeentelijke dienstenpagina beschrijft vooral huisvesting van internationale werknemers.
- Laat de gemeente of jurist bepalen of de vergunningplicht algemeen geldt of alleen binnen een aanwijzings-/uitvoeringsbesluit voor deze doelgroep.
- Leg het besluit en de beslissende officiële bron vast vóór publieke activering.
- Bronnen: https://lokaleregelgeving.overheid.nl/CVDR720987 en https://www.aalten.nl/verhuurvergunning

## Beheeractie — jaarlijkse waarden

Plan vóór 1 januari 2027 een controle van de WOZ-/NHG-grenzen en huurprijsgrenzen in `data/dynamic-parameters.json`. Een historische waarde met status `expired-do-not-use` mag nooit in een actuele gebruikersbeslissing worden gebruikt.
