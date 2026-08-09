# Beheer van jaarlijkse waarden

Jaarafhankelijke grensbedragen staan uitsluitend in `data/dynamic-parameters.json`. Iedere waarde bevat gemeente, regeling, jaar, geldigheidsperiode, officiële bron, laatste controle, verwachte volgende wijziging en status.

De kwaliteitscontrole draait bij iedere wijziging en maandelijks. Een waarde met status `current` na `validUntil` laat CI falen. Een oude waarde krijgt status `expired-do-not-use` en mag niet als actuele besliswaarde worden gebruikt. Als nog geen nieuw officieel bedrag is gepubliceerd, blijft de toepassing geblokkeerd; er wordt geen bedrag geschat.

De broncontrole volgt wijzigingen aan de officiële pagina's. Op of vóór `nextExpectedUpdate` wordt de opvolgende jaarwaarde toegevoegd, waarna de oude waarde wordt geblokkeerd. Voor Alblasserdam volgt de opkoopgrens de standaard NHG-grens zonder energiebesparende voorzieningen; voor 2026 is dat €470.000.
