import type { Store } from "@/lib/db/store";
import type { Memory, MemoryKind } from "@/lib/types";
import { cosine, embed } from "@/lib/ai/embeddings";

/** Score = 0.5·relevance + 0.3·importance + 0.2·recency (Generative Agents style). */
export function scoreMemory(m: Memory, situationVec: number[], today: number): number {
  const relevance = m.embedding ? cosine(m.embedding, situationVec) : 0;
  const importance = m.importance / 10;
  const recency = Math.pow(0.9, Math.max(0, today - m.sim_day));
  return 0.5 * relevance + 0.3 * importance + 0.2 * recency;
}

export function rankMemories(memories: Memory[], situationVec: number[], today: number, n: number): Memory[] {
  return [...memories]
    .map((m) => ({ m, s: scoreMemory(m, situationVec, today) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, n)
    .map((x) => x.m);
}

export async function recall(store: Store, residentId: string, situation: string, today: number, n = 8): Promise<Memory[]> {
  const all = await store.listMemories(residentId);
  const vec = await embed(situation);
  const top = rankMemories(all, vec, today, n);
  await store.touchMemories(top.map((m) => m.id), today);
  return top;
}

export async function remember(store: Store, residentId: string, kind: MemoryKind, content: string, importance: number, day: number, hour: number): Promise<Memory> {
  return store.addMemory({
    resident_id: residentId, kind, content, importance,
    sim_day: day, sim_hour: hour, embedding: await embed(content), last_accessed: day,
  });
}

/** Top memories by importance within the last `days` days: input for reflection and planning. */
export function mostImportant(memories: Memory[], today: number, days: number, n: number): Memory[] {
  return memories
    .filter((m) => m.sim_day > today - days)
    .sort((a, b) => b.importance - a.importance || b.sim_day - a.sim_day)
    .slice(0, n);
}
