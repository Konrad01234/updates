# Kleinstadt – Phase 1 und 2

Lebendige KI-Simulation der Kleinstadt Lindenbach. Spezifikationen: `SPEC.md` (Phase 1), `SPEC-PHASE2.md` (Phase 2).

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

## Starten

```bash
npm install
cp .env.example .env.local        # Keys eintragen, oder MOCK_AI=true lassen
npm test                          # 16 Tests
MOCK_AI=true npm run sim:day 2    # zwei Tage im Terminal, ohne Kosten
npm run dev                       # http://localhost:3000
```

Ohne Supabase-Zugangsdaten läuft alles im Arbeitsspeicher des Dev-Servers (geht beim Neustart verloren). Mit `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` wird Supabase genutzt; vorher `supabase/migrations/0001_init.sql` im SQL-Editor ausführen (pgvector muss aktiviert sein).

## Nächster Schritt mit Claude Code

```
Lies SPEC.md, SPEC-PHASE2.md und README.md. Phase 1 und 2 sind programmiert und mit Mock-KI getestet. Führe `npm install` und `npm test` aus. Dann: (1) Mit echten API-Keys Schritt 5 und 6 aus SPEC.md nachweisen. (2) `npm run dev` starten und die Kartenansicht, die Geschwindigkeiten 1×/5×/20× und das Zurückspulen im Browser prüfen; behebe Fehler in app/page.tsx, app/MapCanvas.tsx und app/api/sim/stream. (3) Abnahme Phase 2 laut SPEC-PHASE2.md. Keine neuen Bibliotheken ohne Rückfrage, frage nach jedem Punkt, ob du weitermachen sollst.
```
