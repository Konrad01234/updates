import type { SimEvent } from "@/lib/types";
import { SYSTEM_TOWN } from "./shared";

export function newspaperPrompt(events: SimEvent[], names: Map<string, string>, day: number, previousProblem: string) {
  const list = events.map((e) => {
    const who = e.resident_ids.map((id) => `${names.get(id) ?? id} (${id})`).join(", ");
    const talk = e.transcript ? ` Gespräch: ${e.transcript.map((t) => `${names.get(t.speaker) ?? t.speaker}: ${t.text}`).join(" / ")}` : "";
    return `- [${e.id}] ${e.sim_hour} Uhr, ${e.type}: ${e.summary}${who ? ` (${who})` : ""}${talk}`;
  }).join("\n");
  return {
    system: `${SYSTEM_TOWN} Du bist die Redaktion des „Lindenbacher Boten“, einer Lokalzeitung. Du berichtest nur über Ereignisse aus der Liste, erfindest keine Fakten, Zitate oder Namen.`,
    user: `Ereignisse von Tag ${day}:
${list}

Wähle 3 bis 5 Geschichten. Pro Artikel: Schlagzeile, Teaser (1 Satz), Text mit 80 bis 150 Wörtern, Ressort (Lokales, Wirtschaft, Gesellschaft, Wetter, Klatsch), die event_ids aus den eckigen Klammern, auf denen der Artikel beruht, und mentioned_resident_ids (Ids in Klammern) aller genannten Personen.${previousProblem ? `\n\nVorheriger Versuch abgelehnt: ${previousProblem}. Nutze nur Ids aus der Liste.` : ""}

Schema: { "articles": [{ "headline": "...", "teaser": "...", "body": "...", "section": "Lokales", "event_ids": [12], "mentioned_resident_ids": ["karl"] }] }`,
  };
}
