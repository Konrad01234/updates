# Kleinstadt – Spezifikation Phase 4: Gott-Modus und Zeitung

Stand: 12.10.2026

## Ziel von Phase 4

Am Ende von Phase 4 kannst du in die Stadt eingreifen, jeden Morgen eine Zeitung lesen, die wirklich über das Geschehene berichtet, das Beziehungsnetz sehen und Gespräche live mitlesen. Damit ist das Projekt vollständig.

Das muss funktionieren:

- Gott-Modus: freie Texteingabe („Ein Sturm zerstört das Rathaus“), neue Bewohner einziehen lassen, Bewohner entfernen
- Ein Regisseur-Agent mit Fable 5.1 übersetzt Eingriffe in konkrete Zustandsänderungen und Erinnerungen
- Tageszeitung „Lindenbacher Bote“ um 6 Uhr mit 3 bis 5 Artikeln aus den echten Ereignissen des Vortags
- Beziehungsgraph als interaktives Netz mit Verlauf über die Tage
- Live-Belauschen: Gespräch wird Satz für Satz gestreamt, während es entsteht

Nicht enthalten: Mehrspieler, Speichern mehrerer Städte, mobile Ansicht. Das wäre eine mögliche Phase 5.

## Gott-Modus und Regisseur

Jeder Eingriff ist ein Text, den der Regisseur-Agent (Fable 5.1) in eine Liste geprüfter Operationen übersetzt; nichts wird direkt aus freiem Text in die Datenbank geschrieben.

Ablauf eines Eingriffs:

1. Nutzer tippt den Eingriff und wählt die Reichweite: „alle“, „am Ort X“ oder einzelne Bewohner
2. Der Regisseur bekommt Eingriff, Stadtzustand (Orte, Bewohner, Wetter, Kontostände) und das Operationsschema
3. Er antwortet mit JSON: `{ operations: [...], memories: [...], summary }`
4. Die Oberfläche zeigt die Vorschau („Rathaus wird geschlossen, 3 Bewohner verlieren ihren Arbeitsplatz, 16 Erinnerungen entstehen“), der Nutzer bestätigt
5. Operationen werden in einer Transaktion angewendet, der Eingriff landet als `event` vom Typ `divine`

Erlaubte Operationen des Regisseurs:

| Operation | Felder | Beispiel |
| --- | --- | --- |
| `close_location` | `location_id`, `reason` | Sturm zerstört Rathaus |
| `open_location` | `name`, `type`, `x`, `y`, `owner_id?` | Neues Kino am Marktplatz |
| `add_resident` | vollständiges Profil + Startbeziehungen | Fremder zieht ein |
| `remove_resident` | `resident_id`, `reason` | Bewohner zieht weg |
| `set_weather` | `weather`, `days` | Drei Tage Dauerregen |
| `transfer_money` | `from_id`, `to_id`, `amount`, `reason` | Lottogewinn |
| `set_relationship` | `from_id`, `to_id`, `delta`, `reason` | Zwei verfeinden sich |
| `add_memory` | `resident_id`, `content`, `importance` | Jeder erfährt vom Sturm |

Der Regisseur darf pro Eingriff höchstens 20 Operationen erzeugen und keine Bewohner töten; ein Eingriff, der das verlangt, wird als „zieht weg“ umgesetzt. Neue Bewohner erzeugt er mit vollständigem Profil im Format des Seeds, damit die Agenten-Schleife sie sofort übernimmt.

## Tageszeitung „Lindenbacher Bote“

Um 6 Uhr, nach den Reflexionen und vor der Tagesplanung, schreibt ein Redaktions-Agent (Fable 5.1) die Ausgabe des Tages aus den `events` des Vortags; er erfindet nichts, jeder Artikel verweist auf Event-Ids.

Ablauf:

1. Vorauswahl ohne KI: alle Events des Vortags, sortiert nach Gewicht: `divine` 10, Pleite/Gründung 9, Beziehungsänderung ≥ 30 Punkte 7, Gespräch mit Erinnerung ≥ 7 Wichtigkeit 6, Wetterwechsel 3, Rest 1. Die 25 schwersten gehen in den Prompt.
2. Der Agent wählt 3 bis 5 Geschichten, schreibt Schlagzeile, Teaser und 80 bis 150 Wörter Text und ordnet jede einem Ressort zu: Lokales, Wirtschaft, Gesellschaft, Wetter, Klatsch
3. Antwort als JSON `{ articles: [{ headline, teaser, body, section, event_ids, mentioned_resident_ids }] }`, geprüft mit Zod; Event-Ids, die nicht existieren, führen zu einer Wiederholung
4. Speichern in Tabelle `newspaper` (`sim_day`, `articles` JSON) und Anzeige im Zeitungsfenster

Rückwirkung: Jeder Bewohner, der in einem Artikel genannt wird, bekommt eine Erinnerung „Im Boten stand heute: <Schlagzeile>“ mit Wichtigkeit 5. Karl Brenner liest als Einziger jede Ausgabe komplett und bekommt alle Schlagzeilen als Erinnerung; so verbreitet sich die Zeitung über ihn als Gerücht.

Oberfläche: Zeitungsfenster im Stil einer Lokalzeitung, Titelseite mit Datum „Tag N“, Artikel aufklappbar, Klick auf eine Schlagzeile springt im Protokoll zu den Quell-Events. Archiv aller Ausgaben über die Zeitleiste erreichbar.

## Beziehungsgraph und Live-Belauschen

Beide Funktionen lesen nur bestehende Daten; neue Tabellen braucht es nicht, nur eine Verlaufstabelle `relationship_history`.

Beziehungsgraph:

- Darstellung mit D3 (Force-Layout) im Seitenpanel oder als Vollbild
- Knoten = Bewohner (Farbe wie in 3D), Kanten = gerichtete Beziehungen mit Score ≠ 0; Dicke nach Betrag, Farbe grün (positiv) bis rot (negativ)
- Hover auf eine Kante zeigt `label` und die letzten drei Gründe für Änderungen
- Zeitregler unter dem Graphen: Tag wählen, der Graph zeigt den Stand dieses Tages aus `relationship_history` (ein Eintrag pro Beziehung und Tag, geschrieben um 23 Uhr)
- Filter: nur Familie, nur Konflikte (Score < -30), nur Freundschaften (> 50)

Live-Belauschen:

- Gespräche werden ab Phase 4 mit Streaming erzeugt (`stream: true` im SDK); das Transkript wird satzweise per SSE an den Browser geschickt
- Klick auf zwei Figuren oder auf das Gesprächssymbol öffnet das Belausch-Fenster; Sätze erscheinen mit 1 bis 2 Sekunden Abstand, damit es wie ein echtes Gespräch wirkt
- Bei 20× Geschwindigkeit ist Belauschen deaktiviert
- Das Fenster zeigt unter dem Transkript, welche Erinnerungen beide Teilnehmer aus dem Gespräch mitnehmen und wie sich der Score ändert, sobald das Gespräch beendet ist

Technisch ändert sich an `conversation.ts` nur, dass die Funktion ein `onToken`-Callback annimmt; die JSON-Prüfung am Ende bleibt.

## Umsetzungsschritte

Sechs Schritte; Streaming und Graph zuerst, weil sie klein sind, der Regisseur zuletzt, weil er am meisten Zustand verändert.

- [ ] **1. Streaming-Gespräche:** `onToken` in `conversation.ts`, SSE-Kanal, Belausch-Fenster. Kriterium: Ein Gespräch erscheint satzweise im Browser, die JSON-Prüfung am Ende schlägt in 10 Läufen nie fehl.
- [ ] **2. Beziehungsverlauf:** Tabelle `relationship_history`, Schreiben um 23 Uhr, Backfill für bestehende Tage aus `events`. Kriterium: Für jeden Tag und jede Beziehung existiert genau ein Eintrag.
- [ ] **3. Beziehungsgraph:** D3-Force-Layout, Kanten, Hover, Zeitregler, Filter. Kriterium: Der Graph zeigt für Tag 1 die Seed-Beziehungen und für den aktuellen Tag den Live-Stand.
- [ ] **4. Zeitung:** Vorauswahl, Redaktions-Prompt, Zod-Schema, Tabelle, Zeitungsfenster, Rückwirkung als Erinnerungen. Kriterium: 5 Ausgaben hintereinander, jeder Artikel verweist nur auf echte Event-Ids.
- [ ] **5. Regisseur:** Operationsschema, Prompt, Vorschau, Transaktion, `divine`-Events. Kriterium: „Ein Sturm zerstört das Rathaus“ schließt den Ort, erzeugt Erinnerungen bei allen und erscheint am nächsten Morgen als Aufmacher.
- [ ] **6. Neue Bewohner über den Regisseur:** `add_resident` mit vollständigem Profil, Einzug sichtbar in 3D. Kriterium: Ein eingezogener Fremder führt am ersten Tag mindestens ein Gespräch und taucht im Graphen auf.

Abnahme von Phase 4: 7 Tage mit zwei Eingriffen laufen lassen, die Zeitung berichtet über beide, der Graph zeigt mindestens eine Beziehung, die sich dadurch um 30 Punkte oder mehr verschoben hat, und die Kosten bleiben unter 1,80 € pro Simulationstag.

## Startprompt für Claude Code

Diese Datei als `SPEC-PHASE4.md` ablegen; Phase 3 muss abgenommen sein.

```
Lies SPEC.md, SPEC-PHASE2.md, SPEC-PHASE3.md und SPEC-PHASE4.md vollständig. Phase 1 bis 3 sind fertig, wir bauen jetzt Phase 4.

Regeln:
- Arbeite die Umsetzungsschritte 1 bis 6 aus SPEC-PHASE4.md strikt nacheinander ab. Pro Schritt: kurzer Plan, Umsetzung, Nachweis des Akzeptanzkriteriums, dann Rückfrage.
- Der Regisseur schreibt nie direkt in die Datenbank. Alle Zustandsänderungen laufen über die Operationen aus SPEC-PHASE4.md, jede mit eigenem Zod-Schema, angewendet in einer Transaktion.
- Die Zeitung darf keine Fakten enthalten, die nicht in den übergebenen Events stehen. Baue dafür einen Test, der jede event_id prüft.
- D3 erst in Schritt 3 installieren. Keine weiteren Bibliotheken ohne Rückfrage.
- Kommentare und Variablennamen auf Englisch, alle Texte für Modell und Nutzer auf Deutsch.

Starte mit Schritt 1.
```

Nach Phase 4 ist das Projekt vollständig. Mögliche Erweiterungen danach: Speichern mehrerer Städte, Teilen eines Stadt-Links, mobile Ansicht, eigene Startbewohner über ein Formular.
