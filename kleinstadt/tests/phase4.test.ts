import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@/lib/db/store";
import { seed } from "@/data/seed";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";
import { onConversationTurn } from "@/lib/sim/conversation";
import { validateArticles, selectEvents } from "@/lib/sim/newspaper";
import { applyIntervention, proposeIntervention } from "@/lib/sim/director";
import { turnExtractor } from "@/lib/ai/client";

function lcg(seedValue: number) { let s = seedValue; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }

async function fresh(rng = lcg(21)) {
  process.env.MOCK_AI = "true"; registerDefaultMocks();
  const store = new InMemoryStore(); await store.reset(seed());
  return { store, engine: new Engine(store, { rng }) };
}

describe("phase 4", () => {
  it("streams conversation turns line by line and the final JSON still validates", async () => {
    const { store, engine } = await fresh();
    const lines: string[] = [];
    const off = onConversationTurn((t) => { if (!t.done) lines.push(`${t.speaker}: ${t.text}`); });
    await engine.step(1);
    off();
    const talks = (await store.listEvents(1000)).filter((e) => e.type === "talk");
    expect(talks.length).toBeGreaterThan(0);
    expect(lines.length).toBe(talks.length * 4);
    expect(lines[0]).toMatch(/: Na, auch hier\?$/);
  });

  it("turnExtractor handles fragments split anywhere", () => {
    const out: string[] = [];
    const feed = turnExtractor((s, t) => out.push(`${s}|${t}`));
    const json = '{"turns":[{"speaker":"a","text":"Hallo \\"du\\""},{"speaker":"b","text":"Hi"}],"memories":[]}';
    for (let i = 0; i < json.length; i += 7) feed(json.slice(i, i + 7));
    expect(out).toEqual(['a|Hallo "du"', "b|Hi"]);
  });

  it("writes exactly one relationship history row per relationship and day", async () => {
    const { store, engine } = await fresh();
    await engine.stepDay(); await engine.stepDay();
    const rels = await store.listRelationships();
    const day2 = await store.listRelationshipHistory(2);
    expect(day2.length).toBe(rels.length);
    expect(new Set(day2.map((r) => `${r.resident_id}->${r.other_id}`)).size).toBe(rels.length);
    const day1 = await store.listRelationshipHistory(1);
    expect(day1.length).toBeGreaterThan(0);
    expect(day1.length).toBeLessThanOrEqual(rels.length);
    expect(new Set(day1.map((r) => `${r.resident_id}->${r.other_id}`)).size).toBe(day1.length);
  });

  it("newspaper articles cite only real events and feed memories back", async () => {
    const { store, engine } = await fresh();
    await engine.stepDay(); await engine.stepDay(); await engine.stepDay();
    const papers = await store.listNewspapers();
    expect(papers.map((p) => p.sim_day)).toEqual([2, 3]);
    for (const p of papers) {
      const events = await selectEvents(store, p.sim_day - 1);
      expect(validateArticles(p.articles, events)).toBeNull();
      expect(p.articles.length).toBeGreaterThanOrEqual(1);
    }
    expect((await store.listMemories("karl")).some((m) => m.content.startsWith("Im Boten stand heute"))).toBe(true);
    expect(validateArticles([{ ...papers[0].articles[0], event_ids: [999999] }], await selectEvents(store, 1))).toMatch(/unbekanntes Event/);
  });

  it("a storm closes the school, memories and relationship change, and the paper leads with it", async () => {
    const { store, engine } = await fresh();
    await engine.step(1);
    const day = (await store.getState()).sim_day;
    const proposal = await proposeIntervention(store, "Ein Sturm zerstört die Schule", "alle", day, engine.aiBudget);
    expect(proposal.preview.length).toBeGreaterThan(0);
    expect(proposal.preview[0]).toMatch(/Grundschule wird geschlossen/);
    const nadiaBefore = (await store.listRelationships()).find((r) => r.resident_id === "nadia" && r.other_id === "karl")!.score;
    await applyIntervention(store, await engine.getMap(), "Ein Sturm zerstört die Schule", proposal.operations, proposal.summary, day, 7);
    expect((await store.listLocations()).find((l) => l.id === "schule")!.status).toBe("closed");
    expect((await store.listResidents()).find((r) => r.id === "nadia")!.employer_id).toBeNull();
    expect((await store.listRelationships()).find((r) => r.resident_id === "nadia" && r.other_id === "karl")!.score).toBe(nadiaBefore - 30);
    expect((await store.listMemories("ben")).some((m) => m.content.includes("geschlossen"))).toBe(true);
    await engine.step(18 * 6);
    const events = await store.listEvents(5000);
    expect(events.some((e) => e.type === "divine")).toBe(true);
    const paper = (await store.listNewspapers()).at(-1)!;
    const divine = events.find((e) => e.type === "divine")!;
    expect(paper.articles[0].event_ids).toContain(divine.id);
  });

  it("a stranger added by the director talks on day one and gets a position", async () => {
    const { store, engine } = await fresh();
    await engine.step(1);
    const day = (await store.getState()).sim_day;
    const proposal = await proposeIntervention(store, "Ein Fremder zieht in die Stadt", "alle", day, engine.aiBudget);
    await applyIntervention(store, await engine.getMap(), "Ein Fremder zieht in die Stadt", proposal.operations, proposal.summary, day, 6);
    expect((await store.listResidents()).some((r) => r.id === "viktor")).toBe(true);
    expect((await store.listPositions()).some((p) => p.resident_id === "viktor")).toBe(true);
    await engine.step(18 * 6 - 1);
    const talks = (await store.listEvents(5000)).filter((e) => e.type === "talk" && e.resident_ids.includes("viktor"));
    expect(talks.length).toBeGreaterThan(0);
    expect((await store.listRelationships()).some((r) => r.resident_id === "viktor")).toBe(true);
  });

  it("rejects operations with unknown ids before writing anything", async () => {
    const { store, engine } = await fresh();
    const before = (await store.listEvents(100)).length;
    await expect(applyIntervention(store, await engine.getMap(), "x", [{ op: "add_memory", resident_id: "niemand", content: "...", importance: 3 }], "x", 1, 6)).rejects.toThrow(/Unbekannter Bewohner/);
    expect((await store.listEvents(100)).length).toBe(before);
  });
});
