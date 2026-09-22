# Progress Cockpit

Persönliches Habit- & Motivations-Cockpit: Wochenplan (Schule als fester Termin, Sport, Lesen, Schlafen) zum Abhaken, eigener Hausaufgaben-Bereich, TikTok-Bildschirmzeit-Limit und ein Monatsbudget (z. B. 150 €), von dem jeder Verstoß (z. B. 10 €) abgezogen wird.

- `src/cockpit.html` – die App (eine Datei, kein Build-Tool nötig)
- `index.html` – daraus erzeugt mit `./build.sh`, installierbar als Web-App („Zum Home-Bildschirm“)

Daten liegen lokal im Browser (bzw. in der Cloud, wenn die App als Claude-Artifact läuft). Über **Setup → Backup** lassen sie sich zwischen Geräten übertragen.

TikTok-Sperre und Geld-Sperre laufen über iOS-Bildschirmzeit bzw. ein separates Ausgabe-Konto – Anleitung im Tab **Setup**.
