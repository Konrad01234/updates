# Kleinstadt – Phase 1 bis 3

Lebendige KI-Simulation der Kleinstadt Lindenbach. Spezifikationen: `SPEC.md` (Phase 1), `SPEC-PHASE2.md` (Phase 2), `SPEC-PHASE3.md` (Phase 3).

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
| 4 Lauf-Schleife und SSE-Stream | fertig, im Browser noch nicht geprüft |
| 5 Snapshots und Zurückspulen | fertig, getestet |
| 6 Karte im Browser | fertig als Canvas-2D, im Browser noch nicht geprüft |

Abweichungen von der Spec, bewusst: Die Karte wird in `lib/sim/map.ts` erzeugt statt aus `data/map.json` geladen; Bewohner laufen 10 Felder pro Tick (7 im Grünen), weil 3 Felder bei 60 × 40 Feldern über zwei Stunden pro Weg bedeutet hätten; die Kartenansicht nutzt Canvas 2D statt PixiJS, weil Phase 3 sie ohnehin durch Three.js ersetzt. Migration `0002_phase2.sql` nach `0001_init.sql` ausführen.

## Phase 3

| Schritt aus SPEC-PHASE3.md | Status |
| --- | --- |
| 1 Erweiterung auf 16 Bewohner, 9 öffentliche Orte, 10 Häuser | fertig, getestet |
| 2 Wetter und Licht als Zustand | fertig, getestet (`lib/sim/weather.ts`) |
| 3 Buchhaltung mit Geldsummen-Invariante | fertig, getestet (`lib/sim/economy.ts`) |
| 4 Pleite und Neugründung | fertig, getestet mit Mock-Regisseur |
| 5 3D-Grundszene (`@react-three/fiber`) | geschrieben, im Browser noch nicht geprüft (`app/Scene3D.tsx`) |
| 6 Figuren und Interpolation | geschrieben, im Browser noch nicht geprüft |
| 7 Licht und Wetter in 3D | geschrieben, im Browser noch nicht geprüft |

Migration `0003_phase3.sql` nach `0002_phase2.sql` ausführen. Die 2D-Karte bleibt als Umschalter erhalten. Neue Läden entstehen auf drei freien Grundstücken (`__lots` in `lib/sim/map.ts`).

## Starten

```bash
npm install
cp .env.example .env.local        # Keys eintragen, oder MOCK_AI=true lassen
npm test                          # 21 Tests
MOCK_AI=true npm run sim:day 2    # zwei Tage im Terminal, ohne Kosten
npm run dev                       # http://localhost:3000
```

Ohne Supabase-Zugangsdaten läuft alles im Arbeitsspeicher des Dev-Servers (geht beim Neustart verloren). Mit `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` wird Supabase genutzt; vorher `supabase/migrations/0001_init.sql` im SQL-Editor ausführen (pgvector muss aktiviert sein).

## Nächster Schritt mit Claude Code

```
Lies SPEC.md, SPEC-PHASE2.md, SPEC-PHASE3.md und README.md. Phase 1 bis 3 sind programmiert; die Logik ist mit Mock-KI getestet (21 Tests), die Browser-Ansichten (2D-Karte, 3D-Szene, Stream, Zurückspulen) wurden noch nie im Browser ausgeführt. Führe `npm install` und `npm test` aus. Dann in dieser Reihenfolge, mit Rückfrage nach jedem Punkt: (1) `npm run dev`, 2D-Karte, Geschwindigkeiten 1×/5×/20× und Zurückspulen prüfen und Fehler in app/page.tsx, app/MapCanvas.tsx, app/api/sim/stream beheben. (2) 3D-Ansicht in app/Scene3D.tsx zum Laufen bringen: 60 fps, Klick auf Gebäude und Figuren, Tag-Nacht-Licht, Regen. (3) Mit echten API-Keys Schritt 5 und 6 aus SPEC.md nachweisen, danach die Abnahmen aus SPEC-PHASE2.md und SPEC-PHASE3.md. Keine neuen Bibliotheken ohne Rückfrage.
```
