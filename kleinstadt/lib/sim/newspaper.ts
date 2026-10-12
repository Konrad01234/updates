import type { Store } from "@/lib/db/store";
import type { Article, Newspaper, SimEvent } from "@/lib/types";
import { callJson, type AiBudget } from "@/lib/ai/client";
import { NewspaperSchema } from "@/lib/ai/schemas";
import { newspaperPrompt } from "@/lib/ai/prompts/newspaper";
import { remember } from "./memory";

const DAY_START = 6;
export const GOSSIP_READER = "karl";

/** Pre-selection without AI: weight per event type, the 25 heaviest go into the prompt. */
export function weightEvent(e: SimEvent, bigDeltas: Set<number>): number {
  if (e.type === "divine") return 10;
  if (e.type === "economy" && /(schließt|eröffnet)/.test(e.summary)) return 9;
  if (bigDeltas.has(e.id)) return 7;
  if (e.type === "talk" && e.transcript) return 6;
  if (e.type === "economy") return 4;
  if (e.type === "weather") return 3;
  return 1;
}

export async function selectEvents(store: Store, day: number): Promise<SimEvent[]> {
  const events = (await store.listEventsOfDay(day)).filter((e) => e.type !== "move");
  const bigDeltas = new Set<number>();
  const prev = await store.listRelationshipHistory(day - 1);
  const now = await store.listRelationshipHistory(day);
  for (const r of now) {
    const before = prev.find((p) => p.resident_id === r.resident_id && p.other_id === r.other_id)?.score ?? 0;
    if (Math.abs(r.score - before) >= 30) {
      for (const e of events) if (e.type === "talk" && e.resident_ids.includes(r.resident_id) && e.resident_ids.includes(r.other_id)) bigDeltas.add(e.id);
    }
  }
  return events.map((e) => ({ e, w: weightEvent(e, bigDeltas) })).sort((x, y) => y.w - x.w || y.e.id - x.e.id).slice(0, 25).map((x) => x.e);
}

/** Every article must cite only real events of that day; unknown ids are a schema failure for the caller. */
export function validateArticles(articles: Article[], events: SimEvent[]): string | null {
  const ids = new Set(events.map((e) => e.id));
  for (const a of articles) {
    if (a.event_ids.length === 0) return `Artikel „${a.headline}“ ohne Quell-Event`;
    for (const id of a.event_ids) if (!ids.has(id)) return `Artikel „${a.headline}“ verweist auf unbekanntes Event ${id}`;
  }
  return null;
}

/** 06:00 of `day`: writes the edition about `day - 1`. Returns null when nothing happened. */
export async function writeNewspaper(store: Store, day: number, budget: AiBudget): Promise<Newspaper | null> {
  const yesterday = day - 1;
  const events = await selectEvents(store, yesterday);
  if (events.length < 2) return null;
  const residents = await store.listResidents();
  const names = new Map(residents.map((r) => [r.id, r.name]));
  let last = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callJson("newspaper", { role: "director", ...newspaperPrompt(events, names, yesterday, last) }, NewspaperSchema, budget);
    const problem = validateArticles(res.articles, events);
    if (!problem) {
      const paper: Newspaper = { sim_day: day, articles: res.articles };
      await store.saveNewspaper(paper);
      for (const a of res.articles) {
        await store.addEvent({ sim_day: day, sim_hour: DAY_START, type: "news", resident_ids: a.mentioned_resident_ids, location_id: null, summary: `Lindenbacher Bote: ${a.headline}`, transcript: null });
        for (const id of a.mentioned_resident_ids) if (names.has(id)) await remember(store, id, "observation", `Im Boten stand heute: „${a.headline}“`, 5, day, DAY_START);
      }
      if (names.has(GOSSIP_READER)) {
        const headlines = res.articles.filter((a) => !a.mentioned_resident_ids.includes(GOSSIP_READER)).map((a) => a.headline);
        for (const h of headlines) await remember(store, GOSSIP_READER, "observation", `Im Boten stand heute: „${h}“`, 4, day, DAY_START);
      }
      return paper;
    }
    last = problem;
  }
  throw new Error("Zeitung: Artikel verweisen auf unbekannte Events, zweiter Versuch fehlgeschlagen");
}
