import type { Location, Relationship, Resident } from "@/lib/types";

export type Rng = () => number;

/** Where a resident should be at this hour according to the plan; closed places send them home. */
export function targetLocation(r: Resident, hour: number, locations: Map<string, Location>): { id: string; activity: string } {
  const entry = r.daily_plan.find((p) => p.hour === hour) ?? r.daily_plan.filter((p) => p.hour < hour).at(-1);
  if (!entry) return { id: r.home_id, activity: "zu Hause" };
  const loc = locations.get(entry.location_id);
  const open = loc && loc.status !== "closed" && hour >= loc.open_hour && hour < loc.close_hour;
  return open ? { id: entry.location_id, activity: entry.activity } : { id: r.home_id, activity: "zu Hause (Ort geschlossen)" };
}

export function perceive(r: Resident, location: Location, hour: number, present: Resident[]): string {
  const others = present.filter((p) => p.id !== r.id).map((p) => p.name);
  return `${location.name}, ${hour} Uhr. ${r.current_action}. Anwesend: ${others.join(", ") || "niemand"}.`;
}

export const PAIR_PROBABILITY = { stranger: 0.2, acquaintance: 0.5, close: 0.7 } as const;

export function tie(score: number | undefined, label: string | undefined): keyof typeof PAIR_PROBABILITY {
  if (score === undefined || (score === 0 && !label)) return "stranger";
  return Math.abs(score) >= 50 ? "close" : "acquaintance";
}

/**
 * Picks at most one talking pair among the residents at a location.
 * Candidates are weighted by relationship strength; the chosen pair then talks with that probability.
 */
export function choosePair(present: Resident[], relationships: Map<string, Relationship>, rng: Rng, bonus = 0): [Resident, Resident] | null {
  if (present.length < 2) return null;
  const candidates: { pair: [Resident, Resident]; p: number }[] = [];
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i], b = present[j];
      const rel = relationships.get(`${a.id}->${b.id}`);
      candidates.push({ pair: [a, b], p: Math.min(1, PAIR_PROBABILITY[tie(rel?.score, rel?.label)] + bonus) });
    }
  }
  const total = candidates.reduce((s, c) => s + c.p, 0);
  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.p;
    if (roll <= 0) return rng() < c.p ? c.pair : null;
  }
  return null;
}

export const relKey = (from: string, to: string) => `${from}->${to}`;
