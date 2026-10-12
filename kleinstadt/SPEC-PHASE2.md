# Kleinstadt – Spezifikation Phase 2: Karte und Zeit

Stand: 12.10.2026

## Ziel von Phase 2

Am Ende von Phase 2 bewegen sich die Bewohner sichtbar über eine 2D-Karte, treffen sich auch unterwegs, und die Zeit läuft in Minuten statt in Stunden. Du kannst zu jedem früheren Zeitpunkt zurückspringen und von dort neu laufen lassen.

Das muss funktionieren:

- Karte von Lindenbach als Raster 60 × 40 Felder mit 6 Orten und Straßen dazwischen
- Bewohner laufen auf dem kürzesten Weg von Ort zu Ort und brauchen dafür Simulationszeit
- Begegnungen entstehen auch auf der Straße, nicht nur an Orten
- Zeit läuft in 10-Minuten-Ticks, mit Pause, 1×, 5× und 20× Geschwindigkeit
- Zurückspulen über Snapshots: jeder Simulationstag ab 6 Uhr ist ein Wiederherstellungspunkt

Nicht in Phase 2: 3D, Wetter, Wirtschaft, Gott-Modus, Zeitung. Der Agenten-Kern aus Phase 1 bleibt unverändert; es ändert sich nur, wann und wo er aufgerufen wird.

## Kartenmodell

Die Karte ist ein Raster aus 60 × 40 Feldern mit drei Feldtypen; sie liegt als JSON in `data/map.json` und wird nicht in der Datenbank gespeichert.

| Feldtyp | Begehbar | Bedeutung |
| --- | --- | --- |
| `road` | ja | Straße oder Platz, hier finden Begegnungen unterwegs statt |
| `building` | nein | Gebäudefläche, nur über den Eingang betretbar |
| `green` | ja, langsam (Faktor 1,5) | Park und Wiesen |

Jeder Ort aus Phase 1 bekommt drei neue Felder in `locations`: `x`, `y` (Eingangsfeld) und `footprint` (Liste der Gebäudefelder). Bewohner, die „am Ort“ sind, stehen auf dem Eingangsfeld; die Gebäudefläche wird nur gezeichnet.

Neue Tabelle `positions`: `resident_id`, `x`, `y`, `path` (verbleibende Felder als Array), `sim_day`, `sim_minute`. Sie wird jeden Tick überschrieben, die Historie liegt in `events`.

Layout von Lindenbach, von West nach Ost: Wohnungen am Westrand, Bäckerei und Café am Marktplatz in der Mitte, Grundschule im Norden, Stadtpark im Südosten. Die längste Strecke (Wohnung → Schule) beträgt rund 50 Felder.

## Bewegung und Begegnungen unterwegs

Bewohner laufen 3 Felder pro 10-Minuten-Tick (im Park 2), der Weg kommt aus einer A*-Pfadsuche über das Raster und wird einmal beim Aufbruch berechnet.

Ablauf, wenn der Tagesplan einen Ortswechsel vorsieht:

1. `findPath(from, to)` liefert die Feldfolge; sie landet in `positions.path`
2. Pro Tick werden die nächsten 3 Felder abgearbeitet und `x`, `y` aktualisiert
3. Ist `path` leer, gilt der Bewohner als angekommen und `current_location_id` wird gesetzt
4. Aufbruchszeit = geplante Ankunft minus Wegdauer, damit der Plan aus Phase 1 weiter gilt

Begegnungen unterwegs:

- Zwei Bewohner, die im selben Tick auf benachbarten Straßenfeldern stehen (Abstand ≤ 1), können ein Straßengespräch starten
- Wahrscheinlichkeit: Fremde 5 %, Bekannte 20 %, enge Beziehung 40 %, also deutlich seltener als an Orten
- Ein Straßengespräch hat höchstens 3 Wechsel, beide bleiben 1 Tick stehen und laufen dann weiter
- Pro Bewohner höchstens 1 Straßengespräch pro Weg, damit niemand ewig unterwegs ist

Die Gesprächslogik aus Phase 1 wird unverändert genutzt, nur mit dem Parameter `maxTurns: 3` und dem Ort „auf der Straße bei <nächster Ort>“.

## Zeitsteuerung

Ein Tick sind jetzt 10 Simulationsminuten; die Agenten-Schleife aus Phase 1 wird nur noch zur vollen Stunde aufgerufen, alle anderen Ticks bewegen nur. So bleiben die API-Kosten pro Tag gleich.

| Geschwindigkeit | Echtzeit pro Tick | Verhalten |
| --- | --- | --- |
| Pause | – | Nichts passiert, Karte bleibt bedienbar |
| 1× | 2 s | Zum Zuschauen |
| 5× | 0,4 s | Bewegung sichtbar, Gespräche laufen im Hintergrund |
| 20× | so schnell wie möglich | Gespräche blockieren; die Karte springt, wenn die API noch rechnet |

Die Schleife läuft serverseitig in einer Route `POST /api/sim/run` mit `{ speed }`, die so lange Ticks ausführt, bis `POST /api/sim/pause` kommt oder 24 Stunden Simulationszeit erreicht sind. Der Browser bekommt den Zustand per Server-Sent Events (`GET /api/sim/stream`).

Zurückspulen über Snapshots:

- Jeden Tag um 6 Uhr, vor der Tagesplanung, wird ein Snapshot geschrieben: Tabelle `snapshots` mit `sim_day`, `created_at` und einem JSON-Dump von `residents`, `relationships`, `positions` und den Ids aller `memories` bis dahin
- Zurückspulen auf Tag N: alle Zeilen mit `sim_day >= N` in `memories` und `events` löschen, die drei Tabellen aus dem Snapshot wiederherstellen
- Ab dort läuft die Simulation neu und anders, weil die Modelle nicht deterministisch sind; genau das ist gewollt
- Vorspulen = normales Laufen bei 20×

Feinere Wiederherstellungspunkte (stündlich) sind bewusst nicht vorgesehen, weil die Datenmenge pro Snapshot sonst zu schnell wächst.

## Oberfläche in Phase 2

Die Karte wird mit PixiJS auf einem Canvas gezeichnet; alles andere bleibt React. Pixi ist in Phase 3 leicht durch Three.js ersetzbar, weil die Spiellogik komplett im Server liegt.

- **Karte:** Raster mit drei Feldfarben, Gebäude als Blöcke mit Namen, Eingänge markiert
- **Figuren:** farbige Kreise mit Initialen, bewegen sich zwischen zwei Ticks weich (Interpolation im Browser)
- **Gesprächsblase:** über zwei Figuren im Gespräch erscheint ein Symbol; Klick öffnet das Transkript im Seitenpanel
- **Zeitleiste unten:** Tagesnummer, Uhr, Geschwindigkeitsregler (Pause, 1×, 5×, 20×), Marker pro Snapshot; Klick auf einen Marker fragt „Zu Tag N zurückspulen? Alles danach geht verloren.“
- **Seitenpanel:** wie in Phase 1 (Bewohnerdetails, Protokoll), jetzt zusätzlich mit „Folgen“, damit die Karte eine Figur im Blick behält

Nicht enthalten: Zoom auf einzelne Gebäude, Animationen der Figuren, Tag-Nacht-Färbung. Das kommt mit der 3D-Welt.

## Umsetzungsschritte

Sechs Schritte; die ersten drei laufen ohne Oberfläche im Terminal und mit `MOCK_AI=true`.

- [ ] **1. Karte und Pfadsuche:** `data/map.json`, A* in `lib/sim/pathfinding.ts`, Migration für `positions` und die neuen Felder in `locations`. Kriterium: Vitest findet für alle 15 Ortspaare einen Weg, keiner führt durch ein Gebäude.
- [ ] **2. Minuten-Ticks:** Engine auf 10-Minuten-Ticks umstellen, Aufbruchszeit aus Wegdauer berechnen. Kriterium: `run-day.ts` zeigt für jeden Bewohner pünktliche Ankünfte laut Tagesplan, Abweichung höchstens 1 Tick.
- [ ] **3. Straßenbegegnungen:** Nachbarschaftsprüfung pro Tick, Wahrscheinlichkeiten, `maxTurns`. Kriterium: Über 100 Mock-Tage entstehen 2 bis 6 Straßengespräche pro Tag.
- [ ] **4. Lauf-Schleife und Stream:** `/api/sim/run`, `/api/sim/pause`, `/api/sim/stream` mit SSE. Kriterium: Ein Browser-Tab zeigt Positionen live, ein zweiter Tab kann pausieren.
- [ ] **5. Snapshots:** Tabelle, Schreiben um 6 Uhr, Zurückspulen. Kriterium: Zurückspulen auf Tag 2 und erneutes Laufen ergibt einen anderen Tag 2, Erinnerungen ab Tag 2 sind weg.
- [ ] **6. Karte im Browser:** PixiJS-Canvas, Figuren, Blasen, Zeitleiste. Kriterium: Ein ganzer Tag bei 5× ist flüssig anzusehen, Klick auf eine Blase öffnet das richtige Transkript.

Abnahme von Phase 2: 3 Tage am Stück bei 5× laufen lassen, einmal zurückspulen, und die Kosten bleiben unter 0,60 € pro Simulationstag.

## Startprompt für Claude Code

Diese Datei als `SPEC-PHASE2.md` neben die `SPEC.md` legen; Phase 1 muss abgenommen sein.

```
Lies SPEC.md und SPEC-PHASE2.md vollständig. Phase 1 ist fertig und abgenommen, wir bauen jetzt Phase 2.

Regeln:
- Arbeite die Umsetzungsschritte 1 bis 6 aus SPEC-PHASE2.md strikt nacheinander ab. Pro Schritt: kurzer Plan, Umsetzung, Nachweis des Akzeptanzkriteriums, dann Rückfrage.
- Der Agenten-Kern aus Phase 1 (agent.ts, memory.ts, conversation.ts, reflection.ts) wird nicht umgebaut. Neue Parameter wie maxTurns sind erlaubt, Änderungen an Prompts oder Schemas nicht.
- Schritte 1 bis 3 ohne Oberfläche und mit MOCK_AI=true.
- PixiJS erst in Schritt 6 installieren. Keine weiteren Bibliotheken ohne Rückfrage.
- Pfadsuche und Straßenbegegnungen bekommen Vitest-Tests, bevor du sie implementierst.
- Kommentare und Variablennamen auf Englisch, alle Texte für Modell und Nutzer auf Deutsch.

Starte mit Schritt 1.
```
