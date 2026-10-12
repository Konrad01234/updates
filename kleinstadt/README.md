# Kleinstadt – Phase 1 (Agenten-Kern)

Lebendige KI-Simulation der Kleinstadt Lindenbach. Spezifikation: siehe `SPEC.md`.

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

## Starten

```bash
npm install
cp .env.example .env.local        # Keys eintragen, oder MOCK_AI=true lassen
npm test                          # 10 Tests
MOCK_AI=true npm run sim:day 2    # zwei Tage im Terminal, ohne Kosten
npm run dev                       # http://localhost:3000
```

Ohne Supabase-Zugangsdaten läuft alles im Arbeitsspeicher des Dev-Servers (geht beim Neustart verloren). Mit `NEXT_PUBLIC_SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` wird Supabase genutzt; vorher `supabase/migrations/0001_init.sql` im SQL-Editor ausführen (pgvector muss aktiviert sein).

## Nächster Schritt mit Claude Code

```
Lies SPEC.md und README.md. Schritte 1 bis 4 und 7 sind fertig und getestet. Setze MOCK_AI=false, prüfe Schritt 5 (10 echte Gespräche ohne Schema-Fehler) und Schritt 6 (3 Tage, jeder Bewohner mindestens 3 Reflexionen), und behebe, was nicht nach SPEC.md funktioniert. Keine neuen Bibliotheken ohne Rückfrage.
```
