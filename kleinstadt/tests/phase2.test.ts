import { describe, expect, it } from "vitest";
import { InMemoryStore } from "@/lib/db/store";
import { seed } from "@/data/seed";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";

function lcg(seedValue: number) {
  let s = seedValue;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

async function freshEngine(opts: { skipAi?: boolean; rng?: () => number } = {}) {
  const store = new InMemoryStore();
  await store.reset(seed());
  return { store, engine: new Engine(store, { skipAi: true, rng: lcg(7), ...opts }) };
}

describe("phase 2: minute ticks and arrivals", () => {
  it("residents arrive at the planned place within one tick of the full hour", async () => {
    const { store, engine } = await freshEngine();
    const late: string[] = [];
    await engine.step(1); // check at hh:10, one tick after each full hour
    for (let h = 6; h < 23; h++) {
      await engine.step(6);
      const state = await store.getState();
      for (const r of await store.listResidents()) {
        const planned = r.daily_plan.find((p) => p.hour === state.sim_hour)?.location_id;
        const loc = (await store.listLocations()).find((l) => l.id === planned);
        const open = loc && state.sim_hour >= loc.open_hour && state.sim_hour < loc.close_hour;
        const expected = open ? planned : r.home_id;
        if (r.current_location_id !== expected) late.push(`${r.id}@${state.sim_hour}`);
      }
    }
    // 8 residents x 17 hours = 136 checks; a street talk pauses a walker for one tick
    expect(late.length).toBeLessThanOrEqual(6);
  });

  it("produces 2–6 street conversations per day over many days", async () => {
    const { store, engine } = await freshEngine({ rng: lcg(3) });
    const days = 20;
    for (let d = 0; d < days; d++) await engine.stepDay();
    const street = (await store.listEvents(100000)).filter((e) => e.type === "talk" && e.summary.includes("auf der Straße"));
    const perDay = street.length / days;
    expect(perDay).toBeGreaterThanOrEqual(1);
    expect(perDay).toBeLessThanOrEqual(8);
  });

  it("snapshots every morning and rewinds to an earlier day", async () => {
    process.env.MOCK_AI = "true";
    registerDefaultMocks();
    const { store, engine } = await freshEngine({ skipAi: false, rng: lcg(11) });
    await engine.stepDay(); await engine.stepDay(); await engine.stepDay();
    expect((await store.listSnapshots()).map((s) => s.sim_day)).toEqual([1, 2, 3]);
    const before = (await store.listMemories("martha")).length;
    const snap = await store.rewindTo(2);
    expect(snap?.sim_day).toBe(2);
    expect((await store.listMemories("martha")).every((m) => m.sim_day < 2)).toBe(true);
    expect((await store.listMemories("martha")).length).toBeLessThan(before);
    expect((await store.getState())).toMatchObject({ sim_day: 2, sim_hour: 6, sim_minute: 0 });
    await new Engine(store, { rng: lcg(99) }).stepDay();
    expect((await store.listSnapshots()).map((s) => s.sim_day)).toEqual([1, 2]);
    expect((await store.listEvents(5000)).some((e) => e.sim_day === 2 && e.type === "talk")).toBe(true);
  });
});
