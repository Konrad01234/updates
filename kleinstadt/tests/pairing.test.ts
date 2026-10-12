import { describe, expect, it } from "vitest";
import { choosePair, PAIR_PROBABILITY, targetLocation, tie } from "@/lib/sim/agent";
import type { Location, Relationship, Resident } from "@/lib/types";

const resident = (id: string): Resident => ({
  id, name: id, age: 30, job: "", home_id: "home", work_id: null, personality: "", goals: [],
  daily_plan: [], current_location_id: null, current_action: "",
  balance: 0, daily_wage: 0, employer_id: null,
});

const economy = { owner_id: null, balance: 0, price: 0, daily_cost: 0, days_in_loss: 0, status: "open" as const };

function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

describe("pair selection", () => {
  it("classifies ties", () => {
    expect(tie(undefined, undefined)).toBe("stranger");
    expect(tie(0, "")).toBe("stranger");
    expect(tie(10, "")).toBe("acquaintance");
    expect(tie(-70, "")).toBe("close");
  });

  it("over many days strangers talk rarely and close friends often", () => {
    const rng = lcg(42);
    const count = (score: number | undefined) => {
      const rels = new Map<string, Relationship>();
      if (score !== undefined) rels.set("a->b", { resident_id: "a", other_id: "b", score, label: "", updated_day: 0 });
      let talks = 0;
      for (let i = 0; i < 2000; i++) if (choosePair([resident("a"), resident("b")], rels, rng)) talks++;
      return talks / 2000;
    };
    expect(count(undefined)).toBeCloseTo(PAIR_PROBABILITY.stranger, 1);
    expect(count(20)).toBeCloseTo(PAIR_PROBABILITY.acquaintance, 1);
    expect(count(70)).toBeCloseTo(PAIR_PROBABILITY.close, 1);
  });

  it("returns at most one pair per location", () => {
    const pair = choosePair([resident("a"), resident("b"), resident("c")], new Map(), () => 0.01);
    expect(pair === null || pair.length === 2).toBe(true);
  });
});

describe("targetLocation", () => {
  const locs = new Map<string, Location>([
    ["cafe", { id: "cafe", name: "Café", type: "cafe", description: "", open_hour: 7, close_hour: 19, ...economy }],
    ["home", { id: "home", name: "Home", type: "home", description: "", open_hour: 0, close_hour: 24, ...economy }],
  ]);
  it("sends residents home when the planned place is closed", () => {
    const r = { ...resident("a"), daily_plan: [{ hour: 20, location_id: "cafe", activity: "Kaffee" }] };
    expect(targetLocation(r, 20, locs).id).toBe("home");
    expect(targetLocation({ ...r, daily_plan: [{ hour: 10, location_id: "cafe", activity: "Kaffee" }] }, 10, locs).id).toBe("cafe");
  });
});
