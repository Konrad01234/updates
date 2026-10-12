import type { Store } from "@/lib/db/store";
import type { Location, Relationship, Resident, SimState } from "@/lib/types";
import { DAY_END, DAY_START } from "@/lib/types";
import { callJson, type AiBudget } from "@/lib/ai/client";
import { PlanSchema } from "@/lib/ai/schemas";
import { dailyPlanPrompt } from "@/lib/ai/prompts/dailyPlan";
import { choosePair, perceive, relKey, targetLocation, type Rng } from "./agent";
import { runConversation } from "./conversation";
import { mostImportant, remember } from "./memory";
import { reflect } from "./reflection";

export interface EngineOptions {
  rng?: Rng;
  maxCallsPerDay?: number;
  /** Phase 1 steps 1–4: keep seed plans and skip all model calls. */
  skipAi?: boolean;
}

const OBSERVATIONS = [
  "Ein ruhiger Moment in {loc}.",
  "{loc} ist heute wie immer.",
  "Nichts Besonderes in {loc}, die Zeit vergeht.",
];

export class Engine {
  private rng: Rng;
  private budget: AiBudget;
  private skipAi: boolean;

  constructor(private store: Store, opts: EngineOptions = {}) {
    this.rng = opts.rng ?? Math.random;
    this.budget = { used: 0, limit: opts.maxCallsPerDay ?? Number(process.env.MAX_AI_CALLS_PER_DAY ?? 200) };
    this.skipAi = opts.skipAi ?? false;
  }

  async getState() { return this.store.getState(); }

  /** Runs `ticks` hours. Night (0–5) is skipped: 23 → next day 6. */
  async step(ticks: number): Promise<SimState> {
    let state = await this.store.getState();
    this.budget.used = state.ai_calls_today;
    for (let i = 0; i < ticks; i++) {
      await this.tick(state);
      state = await this.advance(state);
      state.ai_calls_today = this.budget.used;
      await this.store.setState(state);
    }
    return state;
  }

  private async advance(state: SimState): Promise<SimState> {
    if (state.sim_hour >= DAY_END) {
      this.budget.used = 0;
      return { sim_day: state.sim_day + 1, sim_hour: DAY_START, ai_calls_today: 0 };
    }
    return { ...state, sim_hour: state.sim_hour + 1 };
  }

  private async tick(state: SimState): Promise<void> {
    const { sim_day: day, sim_hour: hour } = state;
    const locations = new Map((await this.store.listLocations()).map((l) => [l.id, l]));
    let residents = await this.store.listResidents();

    if (hour === DAY_START && !this.skipAi) {
      await this.planDay(residents, [...locations.values()], day);
      residents = await this.store.listResidents();
    }

    // 1. movement
    for (const r of residents) {
      const target = targetLocation(r, hour, locations);
      if (r.current_location_id !== target.id) {
        await this.store.addEvent({
          sim_day: day, sim_hour: hour, type: "move", resident_ids: [r.id], location_id: target.id,
          summary: `${r.name} geht zu ${locations.get(target.id)?.name}`, transcript: null,
        });
      }
      r.current_location_id = target.id;
      r.current_action = target.activity;
      await this.store.updateResident(r.id, { current_location_id: target.id, current_action: target.activity });
    }

    // 2.–4. encounters, conversations, observations
    const relationships = new Map((await this.store.listRelationships()).map((r) => [relKey(r.resident_id, r.other_id), r]));
    const byLocation = new Map<string, Resident[]>();
    for (const r of residents) byLocation.set(r.current_location_id!, [...(byLocation.get(r.current_location_id!) ?? []), r]);

    const talking = new Set<string>();
    for (const [locId, present] of byLocation) {
      const pair = choosePair(present, relationships, this.rng);
      if (!pair) continue;
      const location = locations.get(locId)!;
      if (this.skipAi) {
        await this.store.addEvent({
          sim_day: day, sim_hour: hour, type: "talk", resident_ids: [pair[0].id, pair[1].id], location_id: locId,
          summary: `${pair[0].name} und ${pair[1].name} reden in ${location.name} (Mock)`, transcript: null,
        });
      } else {
        await runConversation(this.store, pair[0], pair[1], location, day, hour, relationships, this.budget);
      }
      talking.add(pair[0].id); talking.add(pair[1].id);
    }
    for (const r of residents) {
      if (talking.has(r.id)) continue;
      const loc = locations.get(r.current_location_id!)!;
      const text = OBSERVATIONS[Math.floor(this.rng() * OBSERVATIONS.length)].replace("{loc}", loc.name)
        + ` ${perceive(r, loc, hour, byLocation.get(loc.id) ?? [])}`;
      await remember(this.store, r.id, "observation", text, 1 + Math.floor(this.rng() * 3), day, hour);
    }

    // end of day
    if (hour === DAY_END && !this.skipAi) {
      for (const r of residents) await reflect(this.store, r, day, this.budget);
    }
  }

  private async planDay(residents: Resident[], locations: Location[], day: number) {
    for (const r of residents) {
      const all = await this.store.listMemories(r.id);
      const prompt = dailyPlanPrompt(r, locations, mostImportant(all, day, 1, 5), day);
      const res = await callJson("plan", { role: "resident", ...prompt }, PlanSchema, this.budget);
      await this.store.updateResident(r.id, { daily_plan: res.plan });
    }
  }
}

export type { Relationship };
