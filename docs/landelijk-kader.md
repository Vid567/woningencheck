# Landelijk kader: kopen om te verhuren, kamerverhuur en splitsen

Gecontroleerd op 24 oktober 2026. Deze laag geldt in elke gemeente en wordt niet per gemeente herhaald in `data/regulations.json`. Gemeentelijke regels bouwen hierop voort.

## Opkoopbescherming (Huisvestingswet 2014, artikel 41 e.v.)

- Een gemeente *kan* in een huisvestingsverordening opkoopbescherming invoeren. Het is geen landelijke plicht: zonder gemeentelijke verordening geldt geen opkoopbescherming.
- Werking: een aangewezen bestaande koopwoning mag in de eerste **vier jaar** na inschrijving van de leveringsakte alleen met een verhuurvergunning worden verhuurd.
- De gemeente kiest zelf de wijken en de WOZ-grens. Veel gemeenten koppelen de grens aan de **NHG-kostengrens: € 470.000 in 2026** (bron: nhg.nl, opgeslagen als `nhg-cost-limit-2026` in `data/dynamic-parameters.json`). Andere gemeenten gebruiken een eigen, jaarlijks geïndexeerde grens.
- Wettelijke vergunningsgronden die de gemeente moet honoreren: verhuur aan bloed- of aanverwanten in de eerste of tweede graad; tijdelijke verhuur (maximaal twaalf maanden) door een eigenaar die er minstens twaalf maanden zelf heeft gewoond; een woning die onlosmakelijk deel is van een winkel-, kantoor- of bedrijfsruimte.
- Niet beschermd: woningen die bij overdracht al langer dan zes maanden verhuurd waren, en (sinds 2024) nieuwbouw.

## Omzetting naar kamers en woningvorming (Huisvestingswet 2014, artikel 21)

- Een gemeente *kan* een vergunningplicht instellen voor het omzetten van een zelfstandige woning naar onzelfstandige woonruimte (kamers) en voor woningvorming (één woning verbouwen tot meerdere zelfstandige woningen).
- Sinds de Omgevingswet (1 januari 2024) regelen veel gemeenten kamerverhuur en woningsplitsing (ook) via het **omgevingsplan**: dan is een omgevingsvergunning voor afwijken van het omgevingsplan nodig. Sommige gemeenten hebben beide routes.
- Bouwtechnische eisen (geluid, brandveiligheid, maten) volgen uit het Besluit bouwwerken leefomgeving. Bij vijf of meer kamers is vrijwel overal een melding brandveilig gebruik nodig.

## Splitsing in appartementsrechten (Huisvestingswet 2014, artikel 22)

- Een gemeente *kan* een splitsingsvergunning verplicht stellen voor het juridisch splitsen van woongebouwen in appartementsrechten. Gemeenten verschillen sterk in ouderdomsgrens (bijvoorbeeld 15 of 25 jaar), huurgrens en gebied.

## Wet goed verhuurderschap (sinds 1 juli 2023)

- Geldt voor alle verhuurders: basisnormen voor huurcontract, discriminatieverbod, borg, servicekosten en informatieplicht.
- Gemeenten *kunnen* in aangewezen gebieden een **verhuurvergunning** verplicht stellen (bijvoorbeeld Arnhem). Voor verhuur aan arbeidsmigranten mag die vergunningplicht in de hele gemeente gelden.
- Bron: https://wetten.overheid.nl/BWBR0048028

## Wet versterking regie volkshuisvesting (in werking 1 juli 2026)

- Gemeenten moeten **uiterlijk 1 januari 2028** een huisvestingsverordening met urgentieregeling hebben. Daardoor komen er de komende jaren veel nieuwe of gewijzigde verordeningen: extra reden voor periodieke hercontrole.
- Het bijbehorende besluit treedt naar verwachting op 1 januari 2027 in werking.
- De wet zelf wijzigt de regels voor opkoopbescherming, omzetting en splitsing niet direct.
- Bron: https://rijksoverheid.nl/actueel/nieuws/2026/06/23/wet-versterking-regie-volkshuisvesting-van-kracht-vanaf-1-juli en https://vng.nl/nieuws/wet-versterking-regie-volkshuisvesting-per-1-juli-van-kracht

## Gevolg voor de database

- Een gemeente zonder gemeentelijke regel is niet "vrij van regels": het landelijke kader, het omgevingsplan en de bouwregels blijven gelden.
- "Geen regeling gevonden" wordt alleen vastgelegd met de gecontroleerde bron (`researchedPermitTypes` in `data/research-status.json`).
