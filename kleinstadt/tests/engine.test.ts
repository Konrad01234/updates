import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@/lib/db/store";
import { seed } from "@/data/seed";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";

describe("engine", () => {
  it("runs a day without AI: 18 ticks, move events, day rollover", async () => {
    const store = new InMemoryStore();
    await store.reset(seed());
    const engine = new Engine(store, { skipAi: true, rng: () => 0.99 });
    const state = await engine.stepDay();
    expect(state).toMatchObject({ sim_day: 2, sim_hour: 6, sim_minute: 0 });
    const events = await store.listEvents(5000);
    expect(events.filter((e) => e.type === "move").length).toBeGreaterThan(8);
    expect(events.some((e) => e.type === "talk")).toBe(false);
    for (const r of await store.listResidents()) expect((await store.listMemories(r.id)).length).toBeGreaterThan(3);
  });

  it("runs a full mock day with plans, conversations and reflections", async () => {
    process.env.MOCK_AI = "true";
    registerDefaultMocks();
    const store = new InMemoryStore();
    await store.reset(seed());
    const engine = new Engine(store, { rng: () => 0.1 });
    await engine.stepDay();
    const events = await store.listEvents(5000);
    expect(events.filter((e) => e.type === "talk").length).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === "reflect").length).toBe(16);
    const rels = await store.listRelationships();
    expect(rels.some((r) => r.updated_day === 1)).toBe(true);
    const leon = await store.listMemories("leon");
    expect(leon.some((m) => m.kind === "reflection")).toBe(true);
  });

  it("stops when the AI budget is exhausted", async () => {
    process.env.MOCK_AI = "true";
    registerDefaultMocks();
    const store = new InMemoryStore();
    await store.reset(seed());
    const engine = new Engine(store, { maxCallsPerDay: 3, rng: () => 0.1 });
    await expect(engine.step(1)).rejects.toThrow(/budget/);
  });
});
