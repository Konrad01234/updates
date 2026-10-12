import type { Store } from "@/lib/db/store";
import type { Location, Position, Relationship, Resident, SimState } from "@/lib/types";
import { DAY_END, DAY_START, TICK_MINUTES } from "@/lib/types";
import { callJson, type AiBudget } from "@/lib/ai/client";
import { PlanSchema } from "@/lib/ai/schemas";
import { dailyPlanPrompt } from "@/lib/ai/prompts/dailyPlan";
import { choosePair, perceive, relKey, targetLocation, tie, type Rng } from "./agent";
import { runConversation } from "./conversation";
import { mostImportant, remember } from "./memory";
import { reflect } from "./reflection";
import { buildMap, type TownMap } from "./map";
import { adjacent } from "./pathfinding";
import { entranceOf, initialPosition, isWalking, maybeDepart, ticksPerHour, walk } from "./movement";

export interface EngineOptions {
  rng?: Rng;
  maxCallsPerDay?: number;
  /** keep seed plans and skip every model call (Phase 1 steps 1–4, Phase 2 steps 1–3) */
  skipAi?: boolean;
}

export const STREET_PROBABILITY = { stranger: 0.05, acquaintance: 0.2, close: 0.4 } as const;
const STREET_MAX_TURNS = 3;

const OBSERVATIONS = ["Ein ruhiger Moment in {loc}.", "{loc} ist heute wie immer.", "Nichts Besonderes in {loc}, die Zeit vergeht."];

export class Engine {
  private rng: Rng;
  private budget: AiBudget;
  private skipAi: boolean;
  private map: TownMap | null = null;

  constructor(private store: Store, opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.budget = { used: 0, limit: opts.maxCallsPerDay ?? Number(process.env.MAX_AI_CALLS_PER_DAY ?? 200) };
    this.skipAi = opts.skipAi ?? false;
  }

  async getMap(): Promise<TownMap> {
    if (!this.map) this.map = buildMap((await this.store.listResidents()).map((r) => r.home_id));
    return this.map;
  }

  /** Runs `ticks` ten-minute ticks. Night is skipped: 23:50 → next day 06:00. */
  async step(ticks: number): Promise<SimState> {
    let state = await this.store.getState();
    this.budget.used = state.ai_calls_today;
    for (let i = 0; i < ticks; i++) {
      await this.tick(state);
      state = this.advance(state);
      state.ai_calls_today = this.budget.used;
      await this.store.setState(state);
    }
    return state;
  }

  /** Convenience: a whole day = 18 hours × 6 ticks. */
  async stepDay() { return this.step(18 * ticksPerHour); }

  private advance(state: SimState): SimState {
    const minute = state.sim_minute + TICK_MINUTES;
    if (minute < 60) return { ...state, sim_minute: minute };
    if (state.sim_hour >= DAY_END) {
      this.budget.used = 0;
      return { sim_day: state.sim_day + 1, sim_hour: DAY_START, sim_minute: 0, ai_calls_today: 0 };
    }
    return { ...state, sim_hour: state.sim_hour + 1, sim_minute: 0 };
  }

  private async tick(state: SimState): Promise<void> {
    const { sim_day: day, sim_hour: hour, sim_minute: minute } = state;
    const map = await this.getMap();
    const locations = new Map((await this.store.listLocations()).map((l) => [l.id, l]));
    let residents = await this.store.listResidents();

    if (hour === DAY_START && minute === 0) {
      await this.snapshot(day, residents);
      if (!this.skipAi) { await this.planDay(residents, [...locations.values()], day); residents = await this.store.listResidents(); }
    }

    const positions = new Map((await this.store.listPositions()).map((p) => [p.resident_id, p]));
    for (const r of residents) {
      if (!positions.has(r.id)) {
        positions.set(r.id, initialPosition(map, r));
        if (!r.current_location_id) { r.current_location_id = r.home_id; await this.store.updateResident(r.id, { current_location_id: r.home_id }); }
      }
    }

    // 1. movement: depart in time for the next hour's plan, walk, arrive
    const nextHour = minute === 0 ? hour : Math.min(hour + 1, DAY_END);
    const ticksUntilNextHour = minute === 0 ? 0 : (60 - minute) / TICK_MINUTES;
    for (const r of residents) {
      const pos = positions.get(r.id)!;
      if (!isWalking(pos)) {
        const target = targetLocation(r, nextHour, locations);
        if (target.id !== r.current_location_id && pos.paused_ticks === 0) {
          const from = { x: pos.x, y: pos.y };
          if (maybeDepart(map, pos, from, target.id, ticksUntilNextHour)) {
            r.current_action = `unterwegs zu ${locations.get(target.id)?.name}`;
            await this.store.addEvent({ sim_day: day, sim_hour: hour, type: "move", resident_ids: [r.id], location_id: target.id,
              summary: `${r.name} macht sich auf den Weg zu ${locations.get(target.id)?.name}`, transcript: null });
          }
        }
      }
      if (isWalking(pos)) {
        const arrived = walk(map, pos);
        if (arrived) {
          r.current_location_id = arrived;
          r.current_action = targetLocation(r, nextHour, locations).activity;
          await this.store.addEvent({ sim_day: day, sim_hour: hour, type: "move", resident_ids: [r.id], location_id: arrived,
            summary: `${r.name} kommt in ${locations.get(arrived)?.name} an`, transcript: null });
        } else {
          r.current_location_id = null;
        }
      } else if (minute === 0 && r.current_location_id) {
        r.current_action = targetLocation(r, hour, locations).activity;
      }
      await this.store.updateResident(r.id, { current_location_id: r.current_location_id, current_action: r.current_action });
    }

    const relationships = new Map((await this.store.listRelationships()).map((r) => [relKey(r.resident_id, r.other_id), r]));
    const talking = new Set<string>();

    // 2. street encounters (every tick, only while walking)
    const walkers = residents.filter((r) => isWalking(positions.get(r.id)!));
    for (let i = 0; i < walkers.length; i++) for (let j = i + 1; j < walkers.length; j++) {
      const a = walkers[i], b = walkers[j];
      const pa = positions.get(a.id)!, pb = positions.get(b.id)!;
      if (talking.has(a.id) || talking.has(b.id) || pa.street_talks_this_trip > 0 || pb.street_talks_this_trip > 0) continue;
      if (!adjacent(pa, pb) || map.cells[pa.y][pa.x] !== "road" || map.cells[pb.y][pb.x] !== "road") continue;
      const rel = relationships.get(relKey(a.id, b.id));
      if (this.rng() >= STREET_PROBABILITY[tie(rel?.score, rel?.label)]) continue;
      const near = this.nearestPlace(map, pa, locations);
      const street: Location = { ...near, id: near.id, name: `auf der Straße bei ${near.name}`, description: "Begegnung unterwegs" };
      await this.talk(a, b, street, day, hour, relationships, STREET_MAX_TURNS, "street");
      pa.paused_ticks = pb.paused_ticks = 1;
      pa.street_talks_this_trip++; pb.street_talks_this_trip++;
      talking.add(a.id); talking.add(b.id);
    }

    // 3. hourly agent loop at places
    if (minute === 0) {
      const byLocation = new Map<string, Resident[]>();
      for (const r of residents) if (r.current_location_id) byLocation.set(r.current_location_id, [...(byLocation.get(r.current_location_id) ?? []), r]);
      for (const [locId, present] of byLocation) {
        const pair = choosePair(present.filter((r) => !talking.has(r.id)), relationships, this.rng);
        if (!pair) continue;
        await this.talk(pair[0], pair[1], locations.get(locId)!, day, hour, relationships, 8, "place");
        talking.add(pair[0].id); talking.add(pair[1].id);
      }
      for (const r of residents) {
        if (talking.has(r.id) || !r.current_location_id) continue;
        const loc = locations.get(r.current_location_id)!;
        const text = OBSERVATIONS[Math.floor(this.rng() * OBSERVATIONS.length)].replace("{loc}", loc.name)
          + ` ${perceive(r, loc, hour, byLocation.get(loc.id) ?? [])}`;
        await remember(this.store, r.id, "observation", text, 1 + Math.floor(this.rng() * 3), day, hour);
      }
      if (hour === DAY_END && !this.skipAi) for (const r of residents) await reflect(this.store, r, day, this.budget);
    }

    for (const pos of positions.values()) await this.store.setPosition(pos);
  }

  private async talk(a: Resident, b: Resident, location: Location, day: number, hour: number, relationships: Map<string, Relationship>, maxTurns: number, kind: "place" | "street") {
    if (this.skipAi) {
      await this.store.addEvent({ sim_day: day, sim_hour: hour, type: "talk", resident_ids: [a.id, b.id], location_id: location.id,
        summary: `${a.name} und ${b.name} reden ${kind === "street" ? location.name : `in ${location.name}`} (Mock)`, transcript: null });
      return;
    }
    await runConversation(this.store, a, b, location, day, hour, relationships, this.budget, maxTurns);
  }

  private nearestPlace(map: TownMap, p: Position, locations: Map<string, Location>): Location {
    let best: Location | null = null, bestD = Infinity;
    for (const [id, place] of Object.entries(map.places)) {
      const loc = locations.get(id);
      if (!loc || loc.type === "home") continue;
      const d = Math.abs(place.entrance.x - p.x) + Math.abs(place.entrance.y - p.y);
      if (d < bestD) { bestD = d; best = loc; }
    }
    return best!;
  }

  private async snapshot(day: number, residents: Resident[]) {
    const [relationships, positions] = await Promise.all([this.store.listRelationships(), this.store.listPositions()]);
    let maxId = 0;
    for (const r of residents) for (const m of await this.store.listMemories(r.id)) maxId = Math.max(maxId, m.id);
    await this.store.saveSnapshot({ sim_day: day, created_at: new Date().toISOString(), data: { residents, relationships, positions, max_memory_id: maxId } });
  }

  private async planDay(residents: Resident[], locations: Location[], day: number) {
    for (const r of residents) {
      const all = await this.store.listMemories(r.id);
      const res = await callJson("plan", { role: "resident", ...dailyPlanPrompt(r, locations, mostImportant(all, day, 1, 5), day) }, PlanSchema, this.budget);
      await this.store.updateResident(r.id, { daily_plan: res.plan });
    }
  }
}

export { entranceOf };
