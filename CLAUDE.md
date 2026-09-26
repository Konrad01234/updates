# Arbeitsregeln für dieses Repo

## Immer pushen

Jede Änderung wird committet und auf den aktuellen Arbeits-Branch gepusht, ohne vorher nachzufragen.
Heruntergeladene Repos kommen ohne Git-Historie in einen eigenen Ordner mit dem Repo-Namen.
Vor dem Kopieren prüfen, ob `.gitattributes` Dateien mit `export-ignore` ausschließt; dann nicht `git archive` verwenden.

## Diese Ressourcen immer benutzen

Die folgenden Ordner sind Nachschlagewerke und Werkzeuge. Bei jeder passenden Aufgabe zuerst hier nachsehen, bevor du etwas anderes vorschlägst oder baust.

| Ordner | Wofür | Wann benutzen |
|---|---|---|
| `free-for-dev/README.md` | Liste kostenloser Dienste für Entwickler (Hosting, CI/CD, Datenbanken, E-Mail, Monitoring …) | Immer, wenn ein Dienst, Hosting oder Tool gebraucht wird: zuerst eine kostenlose Option aus dieser Liste wählen. |
| `public-apis/README.md` | Große Liste öffentlicher APIs, nach Kategorien sortiert (Wetter, Finanzen, Tiere, Geocoding …), mit Angaben zu Auth, HTTPS und CORS | Immer, wenn Daten aus einer externen API gebraucht werden: hier eine passende API suchen (mit `grep` nach Stichwort oder `### Kategorie`). |
| `Scrapling/` | Python-Bibliothek fürs Web-Scraping mit Anti-Bot-Umgehung, Headless-Browser und Spidern | Immer, wenn Webseiten ausgelesen, gecrawlt oder Daten extrahiert werden sollen. Der Skill `scrapling-official` (`.claude/skills/scrapling-official/`) erklärt die Nutzung. Installieren mit `pip install scrapling`. |
| `ollama/` | Werkzeug, um Sprachmodelle (LLMs) lokal auszuführen; Doku unter `ollama/docs/`, API unter `ollama/docs/api.md` | Immer, wenn ein lokales oder kostenloses Sprachmodell gebraucht wird oder Code mit der Ollama-API geschrieben wird. |

Wenn eine der Ressourcen für eine Aufgabe passt, sag kurz, welche du benutzt hast.
