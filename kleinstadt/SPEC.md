# Kleinstadt – Spezifikation Phase 1: Agenten-Kern

Stand: 12.10.2026

## Ziel von Phase 1

Am Ende von Phase 1 leben 8 Bewohner in einer Stadt aus 6 Orten, und zwar als reine Text-Simulation ohne Grafik. Die Simulation läuft in Stunden-Schritten durch einen 24-Stunden-Tag und lässt sich im Browser starten, pausieren und Schritt für Schritt vorspulen.

Das muss funktionieren:

- Jeder Bewohner hat Persönlichkeit, Beruf, Tagesplan und ein Langzeitgedächtnis in der Datenbank
- Bewohner am selben Ort führen Gespräche, die aus ihrem Gedächtnis und ihrer Beziehung entstehen
- Nach jedem Gespräch bilden beide neue Erinnerungen und ihre Beziehung ändert sich (Zahl von -100 bis +100)
- Am Tagesende reflektiert jeder Bewohner und zieht ein bis drei Schlüsse (z. B. „Ich glaube, Lena mag mich nicht“)
- Alles ist in einem Protokoll nachlesbar: Wer war wann wo, wer hat mit wem was besprochen

Nicht in Phase 1: 3D, Karte, Wetter, Wirtschaft, Gott-Modus, Zeitung. Diese Punkte bauen auf dem Agenten-Kern auf und kommen in den Phasen 2 bis 4.

## Tech-Stack und Projektstruktur

Next.js 15 (App Router, TypeScript) mit Supabase als Datenbank und der Claude API über das offizielle SDK. Deployment auf Vercel.

| Baustein | Wahl | Grund |
| --- | --- | --- |
| Framework | Next.js 15, TypeScript, Tailwind | Bekannt, läuft auf Vercel |
| Datenbank | Supabase (Postgres) mit pgvector | Gedächtnis mit Embedding-Suche |
| KI | `@anthropic-ai/sdk` | Bewohner: `claude-haiku-5-5`, Regisseur: `claude-fable-5-1` |
| Embeddings | Voyage AI (`voyage-3-lite`) | Ähnlichkeitssuche im Gedächtnis |
| Simulation | Node-Skript (`tsx`) + API-Route | Erst per Terminal, dann aus dem Browser |
| Validierung | Zod | Jede KI-Antwort wird als JSON geprüft |
| Tests | Vitest | Logik ohne API-Aufrufe testbar |

Projektstruktur:

```
kleinstadt/
  app/
    page.tsx                 # Steuerung + Protokoll-Ansicht
    api/sim/step/route.ts    # Einen Simulationsschritt ausführen
    api/sim/reset/route.ts   # Stadt auf Startzustand setzen
  lib/
    sim/
      engine.ts              # Simulationsschleife
      agent.ts               # Agenten-Logik (wahrnehmen, planen, handeln)
      memory.ts              # Erinnerungen speichern und abrufen
      conversation.ts        # Gespräche zwischen zwei Bewohnern
      reflection.ts          # Tagesreflexion
    ai/
      client.ts              # Anthropic-Client, Modellwahl, Retry
      prompts/               # Eine Datei pro Prompt-Typ
      schemas.ts             # Zod-Schemas für alle KI-Antworten
    db/
      supabase.ts
      queries.ts
  data/
    seed.ts                  # Startbewohner und Orte
  scripts/
    run-day.ts               # Einen ganzen Tag im Terminal simulieren
  supabase/migrations/
```

## Datenmodell

Fünf Tabellen in Supabase reichen für Phase 1. Alle Zeitangaben sind Simulationszeit (`sim_day`, `sim_hour`), nicht Echtzeit.

| Tabelle | Wichtige Spalten | Zweck |
| --- | --- | --- |
| `residents` | `id`, `name`, `age`, `job`, `home_id`, `work_id`, `personality` (Text), `goals` (Text-Array), `daily_plan` (JSON), `current_location_id`, `current_action` | Ein Bewohner |
| `locations` | `id`, `name`, `type` (home, work, cafe, park, shop, square), `description`, `open_hour`, `close_hour` | Ein Ort |
| `memories` | `id`, `resident_id`, `kind` (observation, conversation, reflection), `content`, `importance` (1–10), `sim_day`, `sim_hour`, `embedding` (vector 512), `last_accessed` | Eine Erinnerung |
| `relationships` | `resident_id`, `other_id`, `score` (-100 bis +100), `label` (Text, z. B. „alte Freundin“), `updated_day` | Gerichtete Beziehung A → B |
| `events` | `id`, `sim_day`, `sim_hour`, `type` (move, talk, action, reflect), `resident_ids`, `location_id`, `summary`, `transcript` (JSON, nur bei talk) | Protokoll für die Anzeige |

Regeln:

- `importance` vergibt das Modell beim Anlegen der Erinnerung; Smalltalk bekommt 1–3, ein Streit 7–9
- Beziehungen sind gerichtet: Anna kann Ben mögen, ohne dass Ben Anna mag
- `daily_plan` ist eine Liste von `{ hour, location_id, activity }` und wird jeden Morgen neu erzeugt
- `events` ist nur für Menschen lesbar gedacht und wird nie als Prompt-Eingabe genutzt; die Agenten sehen nur ihre `memories`

## Agenten-Architektur

Die Stundenschleife läuft über Wahrnehmen, Planen und Handeln; jede Handlung schreibt ins Gedächtnis, jede Planung liest daraus. Die Reflexion am Tagesende verdichtet die 20 wichtigsten Erinnerungen zu Schlüssen, die am nächsten Morgen den Tagesplan prägen.

```
Wahrnehmen ──(Tagesplan + Situation)──► Planen
    ▲                                      │ jede Stunde
    │ nächster Tag, 6 Uhr      Gedächtnis  ▼
Reflektieren ◄──(Tagesende, 23 Uhr)──── Handeln

Gedächtnis: Planen liest (Abruf, 8 Erinnerungen), Handeln schreibt (speichern),
Reflektieren liest 20 Erinnerungen und schreibt 1–3 Schlüsse.
```

Jeder Schritt ist eine eigene Funktion in `agent.ts` mit klarer Ein- und Ausgabe, damit Claude Code sie einzeln testen kann:

| Schritt | Eingabe | Ausgabe | API-Aufruf |
| --- | --- | --- | --- |
| `perceive(resident, tick)` | Ort, Uhrzeit, anwesende Bewohner | Situationstext | nein |
| `recall(resident, situation, n = 8)` | Situationstext | 8 Erinnerungen nach Score | nur Embedding |
| `plan(resident, tick)` | Situation, Erinnerungen, Beziehungen | Aktion: `talk` mit Partner oder `observe` | nein (Regelwerk) |
| `act(action)` | Aktion | Event, neue Erinnerungen, Beziehungsänderung | ja, bei `talk` |
| `reflect(resident, day)` | 20 wichtigste Erinnerungen | 1–3 Schlüsse als Erinnerungen | ja, Fable 5.1 |

Die Paarauswahl in `plan` ist bewusst regelbasiert und nicht KI-gesteuert, damit sie schnell, kostenlos und testbar bleibt.

## Simulationsschleife und Zeitmodell

Ein Tick ist eine Simulationsstunde, ein Tag hat 24 Ticks, die Schleife läuft nur zwischen 6 und 23 Uhr aktiv. Ein Tick dauert in Echtzeit so lange wie die API-Aufrufe brauchen (Ziel: unter 20 Sekunden bei 8 Bewohnern).

Ablauf eines Ticks:

1. **Bewegung:** Jeder Bewohner wechselt zu dem Ort, den sein `daily_plan` für diese Stunde vorsieht. Ist der Ort geschlossen, bleibt er zu Hause.
2. **Begegnungen:** Alle Bewohner am selben Ort werden gruppiert. Pro Ort wird höchstens ein Gespräch zwischen zwei Personen gestartet, gewählt nach einem Zufallsgewicht: Fremde 20 %, Bekannte 50 %, enge Beziehung 70 %.
3. **Gespräche:** Jedes Gespräch hat 4 bis 8 Wechsel und wird in einem einzigen API-Aufruf erzeugt (beide Rollen im selben Prompt). Ergebnis: Transkript, je eine Erinnerung pro Teilnehmer, je eine Beziehungsänderung.
4. **Einzelaktion:** Wer nicht im Gespräch ist, erzeugt eine kurze Beobachtung als Erinnerung (Wichtigkeit 1–3), ohne API-Aufruf, aus einer Vorlage.
5. **Protokoll:** Alle Schritte landen in `events`.

Tagesgrenzen:

- **6 Uhr:** Jeder Bewohner erzeugt seinen `daily_plan` aus Beruf, Zielen und den 5 wichtigsten Erinnerungen von gestern (ein API-Aufruf pro Bewohner)
- **23 Uhr:** Reflexion. Jeder Bewohner liest seine 20 wichtigsten Erinnerungen der letzten 3 Tage und zieht 1–3 Schlüsse, die als Erinnerung mit Wichtigkeit 6–9 gespeichert werden
- **0 bis 5 Uhr:** Keine Ticks, der Tag springt direkt auf 6 Uhr

Steuerung über `POST /api/sim/step` mit `{ ticks: 1 | 6 | 24 }`. Die Schleife ist idempotent pro Tick: Ein abgebrochener Tick wird beim nächsten Aufruf wiederholt, nicht übersprungen.

## Claude-API-Einsatz

Haiku 5.5 spielt die Bewohner, Fable 5.1 kommt in Phase 1 nur für die Reflexion zum Einsatz, weil dort die tieferen Schlüsse entstehen. Jede Antwort ist reines JSON, wird mit Zod geprüft und bei Fehlern einmal wiederholt.

| Aufgabe | Modell | Aufrufe pro Tag (8 Bewohner) | Antwortformat |
| --- | --- | --- | --- |
| Tagesplan erzeugen | Haiku 5.5 | 8 | `{ plan: [{ hour, location_id, activity }] }` |
| Gespräch erzeugen | Haiku 5.5 | ca. 25 | `{ turns: [{ speaker, text }], memories: [{ resident_id, content, importance }], relationship_deltas: [{ from, to, delta, reason }] }` |
| Reflexion | Fable 5.1 | 8 | `{ insights: [{ content, importance, evidence_memory_ids }] }` |
| Embedding | Voyage | ca. 120 | Vektor |

Prompt-Aufbau für ein Gespräch (eine Datei `prompts/conversation.ts`):

1. System: „Du simulierst ein Gespräch zwischen zwei Bewohnern einer deutschen Kleinstadt. Antworte nur mit JSON nach diesem Schema.“
2. Für beide Personen: Name, Alter, Beruf, Persönlichkeit, aktuelle Ziele, Beziehung zur anderen Person (Score + Label)
3. Für beide Personen: die 8 relevantesten Erinnerungen (siehe Abruf unten)
4. Kontext: Ort, Uhrzeit, was beide gerade tun
5. Anweisung: 4–8 Wechsel, natürlich und kurz, Konflikte sind erlaubt, keine Erzählerstimme

Abruf von Erinnerungen (`memory.ts`, nach dem Prinzip von Generative Agents):

```
Score = 0,5 · Relevanz + 0,3 · Wichtigkeit + 0,2 · Aktualität
```

Relevanz ist die Kosinus-Ähnlichkeit zwischen Situation und Erinnerung, Wichtigkeit die gespeicherte Zahl geteilt durch 10, Aktualität fällt pro Simulationstag um 10 %. Die 8 besten Treffer gehen in den Prompt.

Kostenkontrolle:

- Prompt-Caching für den System-Teil und die Bewohner-Profile
- Harte Obergrenze: 200 Aufrufe pro Simulationstag, danach stoppt die Schleife mit Fehlermeldung
- `MOCK_AI=true` in `.env` liefert feste Beispielantworten, damit die Schleife ohne Kosten getestet werden kann
- Erwartete Kosten: unter 0,50 € pro Simulationstag

## Startzustand

Die Stadt heißt Lindenbach, hat 6 Orte und 8 Bewohner mit eingebauten Spannungen, damit vom ersten Tag an etwas passiert. Die Daten liegen in `data/seed.ts` und werden per `/api/sim/reset` geladen.

| Ort | Typ | Öffnungszeit |
| --- | --- | --- |
| Marktplatz | square | immer |
| Café Linde | cafe | 7–19 Uhr |
| Bäckerei Vogt | shop | 6–14 Uhr |
| Grundschule | work | 7–16 Uhr |
| Stadtpark | park | immer |
| Wohnungen (je eine pro Bewohner) | home | immer |

| Bewohner | Alter | Beruf | Persönlichkeit (Kurzform) | Eingebaute Spannung |
| --- | --- | --- | --- | --- |
| Martha Vogt | 61 | Bäckerin, Inhaberin | stolz, misstrauisch, fleißig | Fürchtet, dass das Café ihr Kunden wegnimmt |
| Leon Vogt | 24 | Bäckergeselle | träumerisch, konfliktscheu | Will heimlich nach Berlin ziehen |
| Sofia Marin | 34 | Café-Besitzerin | offen, ehrgeizig, direkt | Neu in der Stadt, plant Frühstücksangebot |
| Karl Brenner | 72 | Rentner, Ex-Bürgermeister | gesellig, nostalgisch, tratscht gern | Verbreitet jedes Gerücht weiter |
| Nadia Yilmaz | 41 | Lehrerin | warmherzig, überlastet, gerecht | Streit mit Karl über den Park |
| Tom Yilmaz | 43 | Gärtner (Stadtpark) | ruhig, stur, loyal | Ehemann von Nadia, mag Leon |
| Elif Yilmaz | 16 | Schülerin | neugierig, rebellisch | Jobbt heimlich im Café |
| Paul Richter | 29 | Postbote | humorvoll, unzuverlässig | Schuldet Martha Geld |

Startbeziehungen: Ehepaare und Familien bei +70, Martha → Sofia bei -30, Nadia → Karl bei -20, Paul → Martha bei -10, alle anderen bei 0 (noch unbekannt). Jeder Bewohner startet mit 3 Erinnerungen, die seine Spannung erklären.

## Benutzeroberfläche in Phase 1

Eine einzige Seite mit drei Bereichen, bewusst schlicht, weil Phase 3 sie ersetzt.

- **Kopfzeile:** Anzeige „Tag 3, 14:00“, Buttons „1 Stunde“, „6 Stunden“, „Ganzer Tag“, „Zurücksetzen“, Status (läuft / bereit / Fehler)
- **Linke Spalte:** Liste der 8 Bewohner mit aktuellem Ort und Tätigkeit; Klick öffnet die Detailansicht mit Persönlichkeit, Tagesplan, den 10 neuesten Erinnerungen und allen Beziehungen als Zahl
- **Rechte Spalte:** Protokoll aus `events`, neueste oben, Gespräche aufklappbar mit vollem Transkript

Die Seite fragt `/api/sim/state` alle 2 Sekunden ab, solange ein Schritt läuft.

## Umsetzungsschritte

Sieben Schritte, jeder mit einem Kriterium, das erfüllt sein muss, bevor der nächste beginnt. Schritte 1 bis 4 laufen komplett mit `MOCK_AI=true`.

- [ ] **1. Grundgerüst:** Next.js-Projekt, Supabase-Verbindung, Migrationen für die 5 Tabellen. Kriterium: `npm run db:migrate` läuft fehlerfrei, `/api/sim/reset` legt Lindenbach an.
- [ ] **2. Zeit und Bewegung:** `engine.ts` mit Tick-Logik, feste Tagespläne aus dem Seed. Kriterium: `npx tsx scripts/run-day.ts` erzeugt 17 Ticks mit Bewegungs-Events, kein API-Aufruf.
- [ ] **3. Gedächtnis:** `memory.ts` mit Speichern, Embedding und Abruf nach Score-Formel. Kriterium: Vitest-Test findet aus 30 Erinnerungen die 8 passendsten zu einer Situation.
- [ ] **4. Begegnungen:** Gruppierung pro Ort, Auswahl der Gesprächspaare nach Gewicht. Kriterium: Über 100 Mock-Tage ergibt sich die erwartete Verteilung (Fremde selten, Freunde oft).
- [ ] **5. Gespräche mit echter KI:** `conversation.ts` mit Prompt, Zod-Schema, Retry. Kriterium: 10 Gespräche hintereinander ohne Schema-Fehler, Erinnerungen und Beziehungsänderungen landen in der Datenbank.
- [ ] **6. Tagesplan und Reflexion:** Morgens Plan, abends Schlüsse mit Fable 5.1. Kriterium: Nach 3 Tagen hat jeder Bewohner mindestens 3 Reflexionen, die auf echte Gespräche verweisen.
- [ ] **7. Oberfläche:** Seite mit Steuerung, Bewohnerliste, Protokoll. Kriterium: Ein ganzer Tag lässt sich im Browser durchlaufen und nachlesen.

Abnahme von Phase 1: 5 Tage am Stück simulieren, Kosten unter 2,50 €, und im Protokoll ist mindestens eine Geschichte erkennbar, die niemand vorgegeben hat (z. B. Karl erzählt Martha von Elifs Job im Café).

## Startprompt für Claude Code

Diese Spezifikation als `SPEC.md` ins Projektverzeichnis legen und mit folgendem Prompt starten. Claude Code arbeitet die Schritte dann der Reihe nach ab.

```
Lies SPEC.md vollständig. Wir bauen Phase 1 der Simulation „Kleinstadt“.

Regeln:
- Arbeite die Umsetzungsschritte 1 bis 7 strikt nacheinander ab. Beginne jeden Schritt mit einem kurzen Plan, beende ihn erst, wenn das Akzeptanzkriterium nachweislich erfüllt ist, und frage mich dann, ob du weitermachen sollst.
- Schritte 1 bis 4 laufen ausschließlich mit MOCK_AI=true. Keine echten API-Aufrufe vor Schritt 5.
- Jede KI-Antwort wird mit einem Zod-Schema aus lib/ai/schemas.ts geprüft. Kein JSON.parse ohne Schema.
- Halte dich an die Projektstruktur aus SPEC.md. Keine zusätzlichen Frameworks ohne Rückfrage.
- Schreibe für memory.ts und die Paarauswahl Vitest-Tests, bevor du die Logik implementierst.
- Supabase-Zugangsdaten und ANTHROPIC_API_KEY liegen in .env.local. Lege .env.example mit allen Variablen an.
- Kommentare und Variablennamen auf Englisch, alle Texte, die das Modell erzeugt oder die der Nutzer sieht, auf Deutsch.

Starte mit Schritt 1.
```

Vorbereitung vor dem Start:

- [ ] Supabase-Projekt anlegen, pgvector-Erweiterung aktivieren
- [ ] API-Keys für Anthropic und Voyage AI besorgen
- [ ] Leeres Verzeichnis `kleinstadt` mit `SPEC.md` und `.env.local` anlegen
