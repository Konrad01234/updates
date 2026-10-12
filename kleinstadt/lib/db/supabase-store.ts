import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./store";
import type { Location, Memory, Relationship, Resident, SimEvent, SimState } from "@/lib/types";

/** Supabase-backed store. Uses the service role key: server-side only. */
export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor(url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (!url || !key) throw new Error("Supabase credentials missing (.env.local)");
    this.db = createClient(url, key, { auth: { persistSession: false } });
  }

  private unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data as T;
  }

  async getState() {
    return this.unwrap(await this.db.from("sim_state").select("sim_day,sim_hour,ai_calls_today").eq("id", 1).single()) as SimState;
  }
  async setState(state: SimState) {
    this.unwrap(await this.db.from("sim_state").update(state).eq("id", 1));
  }
  async listLocations() { return this.unwrap(await this.db.from("locations").select("*")) as Location[]; }
  async listResidents() { return this.unwrap(await this.db.from("residents").select("*").order("id")) as Resident[]; }
  async updateResident(id: string, patch: Partial<Resident>) {
    this.unwrap(await this.db.from("residents").update(patch).eq("id", id));
  }
  async listMemories(residentId: string) {
    return this.unwrap(await this.db.from("memories").select("*").eq("resident_id", residentId)) as Memory[];
  }
  async addMemory(m: Omit<Memory, "id">) {
    return this.unwrap(await this.db.from("memories").insert(m).select().single()) as Memory;
  }
  async touchMemories(ids: number[], simDay: number) {
    if (ids.length) this.unwrap(await this.db.from("memories").update({ last_accessed: simDay }).in("id", ids));
  }
  async listRelationships() { return this.unwrap(await this.db.from("relationships").select("*")) as Relationship[]; }
  async upsertRelationship(r: Relationship) {
    this.unwrap(await this.db.from("relationships").upsert(r));
  }
  async addEvent(e: Omit<SimEvent, "id">) {
    return this.unwrap(await this.db.from("events").insert(e).select().single()) as SimEvent;
  }
  async listEvents(limit = 200) {
    return this.unwrap(await this.db.from("events").select("*").order("id", { ascending: false }).limit(limit)) as SimEvent[];
  }
  async reset(seed: Parameters<Store["reset"]>[0]) {
    for (const t of ["events", "memories", "relationships", "residents", "locations"]) {
      this.unwrap(await this.db.from(t).delete().neq("id", "__none__"));
    }
    this.unwrap(await this.db.from("locations").insert(seed.locations));
    this.unwrap(await this.db.from("residents").insert(seed.residents));
    this.unwrap(await this.db.from("relationships").insert(seed.relationships));
    this.unwrap(await this.db.from("memories").insert(seed.memories));
    await this.setState({ sim_day: 1, sim_hour: 6, ai_calls_today: 0 });
  }
}
