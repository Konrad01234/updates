import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@/lib/db/store";
import { seed } from "@/data/seed";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";
import { nextWeather } from "@/lib/sim/weather";
import { totalMoney } from "@/lib/sim/economy";
import type { Weather } from "@/lib/types";

function lcg(seedValue: number) { let s = seedValue; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }

async function fresh(opts: { skipAi?: boolean; rng?: () => number } = {}) {
  const store = new InMemoryStore();
  await store.reset(seed());
  return { store, engine: new Engine(store, { skipAi: true, rng: lcg(5), ...opts }) };
}

describe("phase 3", () => {
  it("city has 16 residents, 9 public places and 10 homes", async () => {
    const s = seed();
    expect(s.residents).toHaveLength(16);
    expect(s.locations.filter((l) => l.type !== "home")).toHaveLength(9);
    expect(s.locations.filter((l) => l.type === "home")).toHaveLength(10);
  });

  it("weather distribution over 100 days is roughly 40/37/23", () => {
    const rng = lcg(1);
    const counts: Record<Weather, number> = { sonnig: 0, bewölkt: 0, Regen: 0 };
    let w: Weather | null = null;
    for (let i = 0; i < 3000; i++) { w = nextWeather(w, rng); counts[w]++; }
    expect(counts.sonnig / 3000).toBeCloseTo(0.4, 1);
    expect(counts.bewölkt / 3000).toBeCloseTo(0.37, 1);
    expect(counts.Regen / 3000).toBeCloseTo(0.23, 1);
  });

  it("money is neither created nor destroyed over 10 days", async () => {
    const { store, engine } = await fresh();
    const before = await totalMoney(store);
    for (let d = 0; d < 10; d++) await engine.stepDay();
    expect(await totalMoney(store)).toBeCloseTo(before, 6);
    const tx = await store.listTransactions();
    expect(tx.some((t) => t.reason.startsWith("Besuch"))).toBe(true);
    expect(tx.some((t) => t.reason.startsWith("Lohn"))).toBe(true);
  });

  it("a shop with price 50 goes bankrupt after 7 to 9 days", async () => {
    const { store, engine } = await fresh();
    await store.updateLocation("friseur", { price: 50, daily_cost: 400 });
    let closedDay: number | null = null;
    for (let d = 1; d <= 12 && closedDay === null; d++) {
      await engine.stepDay();
      if ((await store.listLocations()).find((l) => l.id === "friseur")!.status === "closed") closedDay = d;
    }
    expect(closedDay).not.toBeNull();
    expect(closedDay!).toBeGreaterThanOrEqual(7);
    expect(closedDay!).toBeLessThanOrEqual(9);
    const aylin = await store.listMemories("aylin");
    expect(aylin.some((m) => m.importance === 9 && m.content.includes("schließen"))).toBe(true);
  });

  it("a founding creates a place, an owner and a memory (mock director)", async () => {
    process.env.MOCK_AI = "true";
    registerDefaultMocks();
    const { store, engine } = await fresh({ skipAi: false, rng: lcg(8) });
    await engine.stepDay();
    const shops = (await store.listLocations()).filter((l) => l.owner_id === "hanna");
    expect(shops).toHaveLength(1);
    expect(shops[0].name).toBe("Blumen Lange");
    const hanna = (await store.listResidents()).find((r) => r.id === "hanna")!;
    expect(hanna.balance).toBeLessThan(2400);
    expect(hanna.work_id).toBe(shops[0].id);
    expect((await store.listMemories("hanna")).some((m) => m.content.includes("gegründet"))).toBe(true);
    const map = await engine.getMap();
    expect(map.places[shops[0].id]).toBeDefined();
  });
});
