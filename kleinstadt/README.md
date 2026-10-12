# Kleinstadt – alle vier Phasen

Lebendige KI-Simulation der Kleinstadt Lindenbach. Spezifikationen: `SPEC.md` (Phase 1), `SPEC-PHASE2.md`, `SPEC-PHASE3.md`, `SPEC-PHASE4.md`.

## Was schon fertig ist

| Schritt aus SPEC.md | Status |
| --- | --- |
| 1 Grundgerüst, Migration, Reset | fertig |
| 2 Zeit und Bewegung | fertig, getestet |
| 3 Gedächtnis mit Score-Abruf | fertig, getestet |
| 4 Begegnungen und Paarauswahl | fertig, getestet |
| 5 Gespräche mit echter KI | Code fertig, mit echtem API-Key noch nicht ausprobiert |
| 6 Tagesplan und Reflexion | Code fertig, mit echtem API-Key noch nicht ausprobiert |
| 7 Oberfläche | fertig, ohne Supabase läuft sie mit In-Memory-Daten |

## Phase 2

| Schritt aus SPEC-PHASE2.md | Status |
| --- | --- |
| 1 Karte und Pfadsuche | fertig, getestet (`lib/sim/map.ts`, `lib/sim/pathfinding.ts`) |
| 2 Minuten-Ticks | fertig, getestet |
| 3 Straßenbegegnungen | fertig, getestet |
| 4 Lauf-Schleife und SSE-Stream | fertig, im Browser geprüft (1×, 5×, 20×, Pause) |
| 5 Snapshots und Zurückspulen | fertig, getestet |
| 6 Karte im Browser | fertig als Canvas-2D, im Browser geprüft |

Abweichungen von der Spec, bewusst: Die Karte wird in `lib/sim/map.ts` erzeugt statt aus `data/map.json` geladen; Bewohner laufen 10 Felder pro Tick (7 im Grünen), weil 3 Felder bei 60 × 40 Feldern über zwei Stunden pro Weg bedeutet hätten; die Kartenansicht nutzt Canvas 2D statt PixiJS, weil Phase 3 sie ohnehin durch Three.js ersetzt. Migration `0002_phase2.sql` nach `0001_init.sql` ausführen.

## Phase 3

| Schritt aus SPEC-PHASE3.md | Status |
| --- | --- |
| 1 Erweiterung auf 16 Bewohner, 9 öffentliche Orte, 10 Häuser | fertig, getestet |
| 2 Wetter und Licht als Zustand | fertig, getestet (`lib/sim/weather.ts`) |
| 3 Buchhaltung mit Geldsummen-Invariante | fertig, getestet (`lib/sim/economy.ts`) |
| 4 Pleite und Neugründung | fertig, getestet mit Mock-Regisseur |
| 5 3D-Grundszene (`@react-three/fiber`) | fertig, im Browser geprüft (`app/Scene3D.tsx`) |
| 6 Figuren und Interpolation | fertig, im Browser geprüft |
| 7 Licht und Wetter in 3D | fertig, im Browser geprüft (Dämmerung ab 5 Uhr, dunkel ab 21 Uhr) |

Migration `0003_phase3.sql` nach `0002_phase2.sql` ausführen. Die 2D-Karte bleibt als Umschalter erhalten. Neue Läden entstehen auf drei freien Grundstücken (`__lots` in `lib/sim/map.ts`).

## Phase 4

| Schritt aus SPEC-PHASE4.md | Status |
| --- | --- |
| 1 Streaming-Gespräche, Belausch-Fenster | fertig, im Browser geprüft (`turnExtractor`, `onConversationTurn`, `/api/sim/listen`) |
| 2 Beziehungsverlauf mit Backfill | fertig, getestet (`lib/sim/history.ts`) |
| 3 Beziehungsgraph (D3) | fertig, im Browser geprüft (`app/RelationshipGraph.tsx`) |
| 4 Zeitung „Lindenbacher Bote“ | fertig, getestet mit Mock-Redaktion; Artikel ohne gültige Event-Ids werden abgewiesen (`lib/sim/newspaper.ts`) |
| 5 Regisseur / Gott-Modus mit Vorschau | fertig, getestet (`lib/sim/director.ts`, `app/GodMode.tsx`) |
| 6 Neue Bewohner über den Regisseur | fertig, getestet |

Migration `0004_phase4.sql` nach `0003_phase3.sql` ausführen. Die Zeitung erscheint ab Tag 2 um 6 Uhr, die Mock-Ausgabe ist bewusst dünn.

## Starten

```bash
npm install
cp .env.example .env.local        # Keys eintragen, oder MOCK_AI=true lassen
npm test                          # 28 Tests
MOCK_AI=true npm run sim:day 2    # zwei Tage im Terminal, ohne Kosten
npm run dev                       # http://localhost:3000
```

Ohne Supabase-Zugangsdaten läuft alles im Arbeitsspeicher des Dev-Servers (geht beim Neustart verloren). Mit `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` wird Supabase genutzt; vorher `supabase/migrations/0001_init.sql` im SQL-Editor ausführen (pgvector muss aktiviert sein).

## Ohne Server im Browser öffnen

`npm run build:static` bündelt die Oberfläche samt Mock-Simulation in eine einzige Datei `dist-static/lindenbach.html`, die sich direkt im Browser öffnen lässt (Doppelklick, kein Server, keine Keys). `scripts/static/api.ts` beantwortet darin die `/api/sim`-Aufrufe der Oberfläche in der Seite selbst und muss mitgepflegt werden, wenn sich eine Route ändert. Echte KI-Gespräche gibt es nur mit dem Next-Server (`npm run dev`).

## Browser-Prüfung

Alle Ansichten wurden im Mock-Modus mit Headless-Chromium (Playwright) durchgespielt: Laden per SSE-Stream, 10-Minuten-Schritt, 1×/5×/20× mit Pause, 2D-Karte, 3D-Szene bei Tag und Nacht, Protokoll mit Transkripten, Bewohner-Detail mit Folgen, Zeitung ab Tag 2, Beziehungsgraph mit Filter, Gott-Modus mit Vorschau und Anwenden, Belauschen, Zurückspulen über Snapshots. Dabei behoben:

- Im Next-Dev-Server bekam jede API-Route eigene Modulinstanzen, dadurch sahen `step`, `run`, `stream` und `listen` verschiedene Stores. Store, Laufzeitzustand und Belausch-Listener liegen jetzt auf `globalThis`.
- Die 3D-Beschriftungen über drei `<Html>` stürzten mit React 19 beim Unmount ab (`removeChild`-Fehler, Dev-Overlay blockierte die Bedienung). Beschriftungen sind jetzt ein eigenes DOM-Overlay, das pro Frame aus der 3D-Position projiziert wird.
- Das Protokoll zeigte nur die letzte Stunde, weil `move`-Events das 150er-Fenster füllten; der Stream liefert jetzt die letzten 200 Events ohne `move`, und die Sprechblasen richten sich nach der Simulationsuhr statt nach dem neuesten Event.
- Bei Tagesbeginn 06:00 war die 3D-Szene schwarz (Sonnenstand 0) und die Karte leer (Positionen erst nach dem ersten Tick); Dämmerung beginnt jetzt um 5 Uhr und Bewohner stehen vor dem ersten Tick an ihrer Haustür.

Nicht prüfbar ohne GPU: die 60 fps der 3D-Szene (Software-Rendering im Container liegt bei rund 15 fps, ohne Fehler).

## Nächster Schritt mit Claude Code

```
Lies SPEC.md, SPEC-PHASE2.md, SPEC-PHASE3.md, SPEC-PHASE4.md und README.md. Alle vier Phasen sind programmiert, mit Mock-KI getestet (28 Tests) und im Browser durchgespielt. Führe `npm install` und `npm test` aus. Dann mit echten API-Keys (ANTHROPIC_API_KEY, VOYAGE_API_KEY, MOCK_AI=false): Schritt 5 und 6 aus SPEC.md nachweisen, danach die Abnahmen aus SPEC-PHASE2.md bis SPEC-PHASE4.md; Prompts in lib/ai/prompts nachschärfen, wo die Antworten schwach sind. Keine neuen Bibliotheken ohne Rückfrage, frage nach jedem Punkt, ob du weitermachen sollst.
```
