# Progress Cockpit

Persönliches Habit- & Motivations-Cockpit: Wochenplan (Schule als fester Termin, Sport, Lesen, Schlafen) zum Abhaken, Kalender mit freien Zeiten für Extra-Einträge, eigener Hausaufgaben-Bereich und TikTok-Bildschirmzeit-Limit.

- `src/cockpit.html` – die App (eine Datei, kein Build-Tool nötig)
- `index.html` – daraus erzeugt mit `./build.sh`, installierbar als Web-App („Zum Home-Bildschirm“)

Daten liegen lokal im Browser (bzw. in der Cloud, wenn die App als Claude-Artifact läuft). Über **Setup → Backup** lassen sie sich zwischen Geräten übertragen.

Die TikTok-Sperre läuft über die iOS-Bildschirmzeit – Anleitung im Tab **Setup**.
