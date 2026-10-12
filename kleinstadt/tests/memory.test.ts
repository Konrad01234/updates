import { describe, expect, it } from "vitest";
import { mockEmbedding } from "@/lib/ai/embeddings";
import { rankMemories, mostImportant } from "@/lib/sim/memory";
import type { Memory } from "@/lib/types";

const mem = (id: number, content: string, importance: number, day: number): Memory => ({
  id, resident_id: "x", kind: "observation", content, importance, sim_day: day, sim_hour: 12,
  embedding: mockEmbedding(content), last_accessed: 0,
});

describe("memory retrieval", () => {
  it("finds the 8 most relevant of 30 memories for a situation", () => {
    const relevant = Array.from({ length: 8 }, (_, i) => mem(i, `Martha hat über das Café und die Bäckerei geredet ${i}`, 3, 5));
    const noise = Array.from({ length: 22 }, (_, i) => mem(100 + i, `Die Linden im Park wachsen langsam ${i}`, 3, 5));
    const top = rankMemories([...relevant, ...noise], mockEmbedding("Gespräch mit Martha über das Café"), 5, 8);
    expect(top.map((m) => m.id).sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("prefers important and recent memories when relevance is equal", () => {
    const a = mem(1, "gleicher text", 9, 5);
    const b = mem(2, "gleicher text", 2, 5);
    const c = mem(3, "gleicher text", 9, 1);
    const top = rankMemories([b, c, a], mockEmbedding("anderer text"), 5, 3);
    expect(top.map((m) => m.id)).toEqual([1, 3, 2]);
  });

  it("mostImportant respects the day window", () => {
    const ms = [mem(1, "alt", 9, 1), mem(2, "neu", 5, 5), mem(3, "neu wichtig", 8, 4)];
    expect(mostImportant(ms, 5, 3, 10).map((m) => m.id)).toEqual([3, 2]);
  });
});
