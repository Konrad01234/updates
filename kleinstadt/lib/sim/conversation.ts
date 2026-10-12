import type { Store } from "@/lib/db/store";
import type { Location, Relationship, Resident, SimEvent } from "@/lib/types";
import { callJson, turnExtractor, type AiBudget } from "@/lib/ai/client";

/** Phase 4: listeners receive each spoken line while a conversation is generated. */
export type TurnListener = (info: { a: string; b: string; location: string; speaker: string; text: string; done?: boolean }) => void;
const listeners = new Set<TurnListener>();
export const onConversationTurn = (l: TurnListener) => { listeners.add(l); return () => listeners.delete(l); };
import { ConversationSchema } from "@/lib/ai/schemas";
import { conversationPrompt } from "@/lib/ai/prompts/conversation";
import { recall, remember } from "./memory";
import { relKey } from "./agent";

const clamp = (x: number) => Math.max(-100, Math.min(100, x));

export async function runConversation(
  store: Store, a: Resident, b: Resident, location: Location, day: number, hour: number,
  relationships: Map<string, Relationship>, budget: AiBudget, maxTurns = 8,
): Promise<SimEvent> {
  const situation = `Gespräch mit ${b.name} in ${location.name}`;
  const [memA, memB] = await Promise.all([
    recall(store, a.id, situation, day),
    recall(store, b.id, `Gespräch mit ${a.name} in ${location.name}`, day),
  ]);
  const prompt = conversationPrompt({
    a, b, memA, memB, location, hour, day, maxTurns,
    relAB: relationships.get(relKey(a.id, b.id)), relBA: relationships.get(relKey(b.id, a.id)),
  });
  const emit = (speaker: string, text: string, done = false) => { for (const l of listeners) l({ a: a.id, b: b.id, location: location.name, speaker, text, done }); };
  const onToken = listeners.size ? turnExtractor((sp, tx) => emit(sp, tx)) : undefined;
  const res = await callJson("conversation", { role: "resident", ...prompt, onToken }, ConversationSchema, budget);
  if (listeners.size) emit("", "", true);

  for (const m of res.memories) {
    await remember(store, m.resident_id, "conversation", m.content, m.importance, day, hour);
  }
  for (const d of res.relationship_deltas) {
    const key = relKey(d.from, d.to);
    const prev = relationships.get(key) ?? { resident_id: d.from, other_id: d.to, score: 0, label: "", updated_day: day };
    const next: Relationship = { ...prev, score: clamp(prev.score + d.delta), label: prev.label || d.reason, updated_day: day };
    relationships.set(key, next);
    await store.upsertRelationship(next);
  }
  return store.addEvent({
    sim_day: day, sim_hour: hour, type: "talk", resident_ids: [a.id, b.id], location_id: location.id,
    summary: `${a.name} und ${b.name} reden ${location.name.startsWith("auf der") ? location.name : `in ${location.name}`}: ${res.memories[0].content}`,
    transcript: res.turns,
  });
}
