# Kleinstadt – Spezifikation Phase 3: 3D-Welt und Wirtschaft

Stand: 12.10.2026

## Ziel von Phase 3

Am Ende von Phase 3 ist Lindenbach eine 3D-Stadt mit Tag-Nacht-Zyklus und Wetter, und die Bewohner haben Geld: Läden verdienen, zahlen Löhne, können pleitegehen, und ein Bewohner kann ein neues Geschäft gründen.

Das muss funktionieren:

- 3D-Ansicht mit Three.js, frei drehbare Kamera, Klick auf Figuren und Gebäude
- Sonnenstand und Beleuchtung folgen der Simulationszeit, nachts brennen Fenster
- Wetter (sonnig, bewölkt, Regen) pro Tag, das Tagespläne beeinflusst
- Jeder Bewohner hat ein Konto, jeder Laden Einnahmen, Ausgaben und einen Kontostand
- Ein Laden mit 7 Tagen Minus in Folge schließt; ein Bewohner mit genug Geld und passendem Ziel kann einen Laden eröffnen
- Die Bevölkerung wächst auf 16 Bewohner und 10 Orte

Nicht in Phase 3: Gott-Modus, Zeitung, Beziehungsgraph, Belauschen. Die Karte aus Phase 2 bleibt als Datenmodell erhalten, nur die Darstellung wird ersetzt.

## 3D-Welt mit Three.js

Die 3D-Szene ist eine reine Anzeige des Rasters aus Phase 2; jedes Feld wird eine Bodenkachel, jeder `footprint` ein Gebäude-Block. Umgesetzt mit `@react-three/fiber` und `@react-three/drei`, damit die Szene als React-Komponenten lebt.

| Element | Darstellung | Quelle |
| --- | --- | --- |
| Boden | Kacheln 1 × 1 in drei Farben (Straße, Gebäude, Grün) | `map.json` |
| Gebäude | Quader auf dem `footprint`, Höhe nach Typ (Wohnung 2, Laden 3, Schule 4), Schild mit Name | `locations` |
| Figuren | Kapsel aus Zylinder + Kugel, Farbe pro Bewohner, Namensschild bei Nähe der Kamera | `positions` |
| Gespräch | Schwebendes Symbol über beiden Figuren, Klick öffnet Transkript | `events` |
| Kamera | Orbit um die Stadtmitte, Zoom 10 bis 80 Einheiten, „Folgen“ hält eine Figur im Bild | Oberfläche |

Bewegung: Der Browser interpoliert Positionen zwischen zwei Ticks linear, damit Figuren bei 1× und 5× gleiten statt springen. Bei 20× wird nicht interpoliert.

Leistung: Alle Kacheln als eine `InstancedMesh`, alle Gebäude als eine zweite; Ziel sind 60 fps auf einem MacBook bei 16 Figuren. Keine Schatten in der ersten Fassung, keine importierten 3D-Modelle; alles wird aus Grundformen gebaut.

## Tag-Nacht-Zyklus und Wetter

Licht und Wetter sind Simulationszustand, nicht nur Grafik: Sie stehen in einer neuen Tabelle `world` (`sim_day`, `weather`, `temperature`) und fließen als Text in die Prompts der Bewohner ein.

Tag-Nacht:

- Sonnenposition aus `sim_minute`: Aufgang 6 Uhr, Höchststand 13 Uhr, Untergang 20 Uhr
- Lichtfarbe: warm am Morgen und Abend, neutral mittags, blau-dunkel nachts
- Nachts leuchten Fenster von Gebäuden, in denen sich jemand aufhält

Wetter wird um 6 Uhr gewürfelt, mit Übergangswahrscheinlichkeiten, damit es realistisch verläuft:

| Heute | Morgen sonnig | Morgen bewölkt | Morgen Regen |
| --- | --- | --- | --- |
| sonnig | 60 % | 30 % | 10 % |
| bewölkt | 30 % | 40 % | 30 % |
| Regen | 20 % | 40 % | 40 % |

Wirkung auf die Bewohner:

- Bei Regen erhält der Tagesplan-Prompt den Satz „Es regnet den ganzen Tag“; erwartbar: weniger Park, mehr Café
- Bei Regen laufen Figuren schneller (Faktor 1,3) und Straßengespräche sind halb so wahrscheinlich
- Sonnige Tage erhöhen die Begegnungswahrscheinlichkeit im Park um 20 Prozentpunkte
- Wetter erscheint als Beobachtung im Gedächtnis (Wichtigkeit 1), damit Bewohner darüber reden können

## Wirtschaft

Geld ist eine einfache Buchhaltung in Euro mit täglicher Abrechnung um 23 Uhr; es gibt keine Banken, Kredite oder Steuern.

Neue Spalten und Tabellen:

| Tabelle | Neue Felder | Zweck |
| --- | --- | --- |
| `residents` | `balance`, `daily_wage`, `employer_id` | Konto und Einkommen |
| `locations` | `owner_id`, `balance`, `price` (Preis pro Besuch), `daily_cost`, `days_in_loss` | Laden als Betrieb |
| `transactions` | `sim_day`, `from_id`, `to_id`, `amount`, `reason` | Nachvollziehbare Buchungen |

Regeln pro Tag:

1. Jeder Besuch eines Ladens (Bäckerei, Café, ab Phase 3 auch Kiosk und Friseur) kostet den Besucher `price` und bringt sie dem Laden; wer kein Geld hat, geht nicht hin
2. Um 23 Uhr zahlt jeder Laden `daily_cost` und die Löhne seiner Angestellten; der Rest geht an den Inhaber
3. Angestellte ohne Laden (Lehrerin, Postbote, Gärtner) bekommen ihren Lohn von der „Stadt“, einem Konto ohne Limit
4. Ein Laden mit `days_in_loss >= 7` schließt: Ort wird `closed`, Angestellte verlieren den Job, der Inhaber bekommt eine Erinnerung mit Wichtigkeit 9
5. Preise passen sich an: 3 Tage in Folge mehr als 10 Besucher → `price` steigt um 10 %; 3 Tage unter 3 Besucher → sinkt um 10 %

Neugründung: Ein Bewohner ohne Laden, mit `balance >= 2000` und einem Ziel, das ein Geschäft erwähnt, bekommt bei der Reflexion die Frage „Willst du einen Laden eröffnen?“ (Fable 5.1). Bei Ja entsteht ein neuer Ort auf einem freien `building`-Feld, Typ und Name wählt das Modell, Startkapital 1500 € werden abgezogen.

Startwerte: Inhaber 3000 €, Angestellte 800 €, Schülerin 50 €; Löhne 60 bis 120 € pro Tag, Brötchen 3 €, Kaffee 4 €, `daily_cost` 80 bis 150 €. Diese Zahlen sind bewusst so gewählt, dass Läden ohne Kundschaft innerhalb von zwei Wochen scheitern.

## Umsetzungsschritte

Sieben Schritte; Wirtschaft und Wetter kommen vor der 3D-Grafik, weil sie die Simulation verändern und mit der 2D-Karte aus Phase 2 geprüft werden können.

- [ ] **1. Erweiterung der Stadt:** 8 neue Bewohner (darunter Kiosk-Besitzer, Friseurin, zwei Rentner, ein Arbeitsloser) und 4 neue Orte (Kiosk, Friseur, Bushaltestelle, zweiter Park). Kriterium: Ein Mock-Tag mit 16 Bewohnern läuft unter 30 Sekunden.
- [ ] **2. Wetter und Licht als Zustand:** Tabelle `world`, Übergangsmatrix, Wirkung auf Pläne und Wege. Kriterium: Über 100 Mock-Tage liegt die Wetterverteilung bei etwa 40/37/23 % (sonnig/bewölkt/Regen).
- [ ] **3. Buchhaltung:** Konten, `transactions`, Tagesabrechnung, Preisanpassung. Kriterium: Summe aller Kontostände plus Stadt-Konto bleibt über 10 Tage konstant (kein Geld entsteht oder verschwindet).
- [ ] **4. Pleite und Neugründung:** Schließung nach 7 Verlusttagen, Gründungsfrage in der Reflexion. Kriterium: Ein Laden mit `price` 50 € geht nach 7 bis 9 Tagen pleite; eine Neugründung erzeugt Ort, Eigentümer und Erinnerung.
- [ ] **5. 3D-Grundszene:** Kacheln, Gebäude, Kamera mit `@react-three/fiber`. Kriterium: 60 fps auf MacBook, Klick auf Gebäude öffnet dessen Detailpanel.
- [ ] **6. Figuren und Interpolation:** Kapseln, Namensschilder, gleitende Bewegung, Gesprächssymbol. Kriterium: Ein Tag bei 5× läuft ohne sichtbares Springen.
- [ ] **7. Licht und Wetter in 3D:** Sonnenstand, Lichtfarbe, Fenster, Regenpartikel. Kriterium: Ein 24-Stunden-Durchlauf zeigt Morgen, Mittag, Abend und Nacht erkennbar unterschiedlich.

Abnahme von Phase 3: 14 Tage am Stück laufen lassen; mindestens ein Laden ändert seinen Preis, einer geht pleite oder wird gegründet, und die Kosten liegen unter 1,20 € pro Simulationstag bei 16 Bewohnern.

## Startprompt für Claude Code

Diese Datei als `SPEC-PHASE3.md` ablegen; Phase 2 muss abgenommen sein.

```
Lies SPEC.md, SPEC-PHASE2.md und SPEC-PHASE3.md vollständig. Phase 1 und 2 sind fertig, wir bauen jetzt Phase 3.

Regeln:
- Arbeite die Umsetzungsschritte 1 bis 7 aus SPEC-PHASE3.md strikt nacheinander ab. Pro Schritt: kurzer Plan, Umsetzung, Nachweis des Akzeptanzkriteriums, dann Rückfrage.
- Schritte 1 bis 4 mit der bestehenden 2D-Karte und MOCK_AI=true, außer die Gründungsfrage in Schritt 4 (echte API, höchstens 10 Aufrufe zum Testen).
- Die Buchhaltung ist deterministisch und bekommt einen Vitest-Test für die Geldsummen-Invariante, bevor du sie implementierst.
- @react-three/fiber und @react-three/drei erst in Schritt 5 installieren. PixiJS danach entfernen.
- Keine importierten 3D-Modelle, keine Texturen; nur Grundformen und Farben.
- Prompts aus Phase 1 dürfen um Wetter- und Geld-Kontext ergänzt werden, die JSON-Schemas bleiben rückwärtskompatibel.
- Kommentare und Variablennamen auf Englisch, alle Texte für Modell und Nutzer auf Deutsch.

Starte mit Schritt 1.
```
