# updates – Skill-Sammlung

Sammelstelle für Claude-Code-Skills. Alles unter `.claude/skills/` wird von Claude Code
automatisch geladen, sobald in diesem Repo gearbeitet wird.

## Enthaltene Skills

| Skill | Wofür | Herkunft / Lizenz |
|---|---|---|
| `ui-ux-pro-max` | UI/UX-Datenbank: 67 Styles, 96 Paletten, 57 Font-Paarungen, 25 Chart-Typen, 13 Stacks | Community-Skill (Umzug aus dem minijob-Repo) |
| `frontend-design` | Gestalterische Richtung für neue Oberflächen – Typografie, Ästhetik, weg vom Template-Look | anthropics/skills · Apache-2.0 |
| `web-artifacts-builder` | Mehrteilige Web-Artefakte mit React, Tailwind und shadcn/ui | anthropics/skills · Apache-2.0 |
| `theme-factory` | Themes (Farben + Fonts) für Slides, Docs, Landingpages – 10 Presets oder neu generiert | anthropics/skills · Apache-2.0 |
| `canvas-design` | Poster, Flyer und andere statische Designs als PNG/PDF (inkl. Font-Paket) | anthropics/skills · Apache-2.0 |
| `webapp-testing` | Lokale Web-Apps mit Playwright bedienen und testen: Screenshots, Browser-Logs, UI-Debugging | anthropics/skills · Apache-2.0 |
| `claude-api` | Referenz zur Claude-API: Modell-IDs, Preise, Streaming, Tool-Use, Caching, Migration | anthropics/skills · Apache-2.0 |
| `mcp-builder` | MCP-Server bauen (Python/FastMCP oder Node/TypeScript), um externe APIs anzubinden | anthropics/skills · Apache-2.0 |
| `skill-creator` | Eigene Skills anlegen, überarbeiten und mit Evals messen | anthropics/skills · Apache-2.0 |

Stand der übernommenen Skills: `anthropics/skills` @ `34040c9` (2026-09-10).
Jeder übernommene Ordner enthält seine `LICENSE.txt` im Original.

## Bewusst nicht übernommen

**Aus Lizenzgründen** – `docx`, `pdf`, `pptx`, `xlsx` aus `anthropics/skills` stehen *nicht*
unter Apache-2.0. Ihre Lizenz untersagt ausdrücklich, Kopien außerhalb der Anthropic-Dienste
aufzubewahren oder weiterzugeben. Sie gehören deshalb nicht in dieses Repo. Wer sie braucht,
installiert sie als Plugin – das ist der vorgesehene Weg und liefert dieselben Skills:

```
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

**Weil sie hier nichts bringen** – `brand-guidelines` und `internal-comms` bilden Anthropics
eigenes Branding bzw. interne Textformate ab, `academy-guide` und `discernment-nudge` sind auf
Anthropic-interne Abläufe zugeschnitten, `algorithmic-art` (generative Kunst) und
`slack-gif-creator` (animierte GIFs für Slack) passen nicht zum Einsatzzweck.
`doc-coauthoring` hat als einziger Ordner im Quell-Repo keine Lizenzdatei – bei unklarer
Lizenz lieber draußen.

## Skills woanders verfügbar machen

Damit die Skills nicht nur in diesem Repo greifen:

```bash
# global für alle Projekte
cp -r .claude/skills/* ~/.claude/skills/

# oder gezielt in ein Projekt, z. B. das Cockpit
cp -r .claude/skills/* ../coldcall/.claude/skills/
```

## Aktualisieren

```bash
git clone --depth 1 https://github.com/anthropics/skills /tmp/anthropic-skills
for s in claude-api frontend-design mcp-builder skill-creator theme-factory \
         web-artifacts-builder webapp-testing canvas-design; do
  rm -rf ".claude/skills/$s"
  cp -r "/tmp/anthropic-skills/skills/$s" ".claude/skills/$s"
done
```
