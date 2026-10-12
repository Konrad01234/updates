import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./store";
import type { Location, Memory, Position, Relationship, Resident, SimEvent, SimState, Snapshot, Transaction, World } from "@/lib/types";

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
    return this.unwrap(await this.db.from("sim_state").select("sim_day,sim_hour,sim_minute,ai_calls_today").eq("id", 1).single()) as SimState;
  }
  async setState(state: SimState) {
    this.unwrap(await this.db.from("sim_state").update(state).eq("id", 1));
  }
  async listLocations() { return this.unwrap(await this.db.from("locations").select("*")) as Location[]; }
  async updateLocation(id: string, patch: Partial<Location>) { this.unwrap(await this.db.from("locations").update(patch).eq("id", id)); }
  async addLocation(l: Location) { this.unwrap(await this.db.from("locations").insert(l)); }
  async getWorld(day: number) { return this.unwrap(await this.db.from("world").select("*").eq("sim_day", day).maybeSingle()) as World | null; }
  async setWorld(w: World) { this.unwrap(await this.db.from("world").upsert(w)); }
  async addTransaction(t: Omit<Transaction, "id">) { this.unwrap(await this.db.from("transactions").insert(t)); }
  async listTransactions(day?: number) {
    const q = this.db.from("transactions").select("*");
    return this.unwrap(await (day === undefined ? q : q.eq("sim_day", day))) as Transaction[];
  }
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
  async listPositions() { return this.unwrap(await this.db.from("positions").select("*")) as Position[]; }
  async setPosition(p: Position) { this.unwrap(await this.db.from("positions").upsert(p)); }
  async saveSnapshot(s: Snapshot) { this.unwrap(await this.db.from("snapshots").upsert(s)); }
  async listSnapshots() { return this.unwrap(await this.db.from("snapshots").select("*").order("sim_day")) as Snapshot[]; }
  async rewindTo(day: number) {
    const snap = this.unwrap(await this.db.from("snapshots").select("*").eq("sim_day", day).maybeSingle()) as Snapshot | null;
    if (!snap) return null;
    this.unwrap(await this.db.from("memories").delete().gte("sim_day", day));
    this.unwrap(await this.db.from("memories").delete().gt("id", snap.data.max_memory_id));
    this.unwrap(await this.db.from("events").delete().gte("sim_day", day));
    this.unwrap(await this.db.from("snapshots").delete().gt("sim_day", day));
    this.unwrap(await this.db.from("residents").upsert(snap.data.residents));
    if (snap.data.locations) this.unwrap(await this.db.from("locations").upsert(snap.data.locations));
    this.unwrap(await this.db.from("transactions").delete().gte("sim_day", day));
    this.unwrap(await this.db.from("world").delete().gt("sim_day", day));
    this.unwrap(await this.db.from("relationships").upsert(snap.data.relationships));
    this.unwrap(await this.db.from("positions").upsert(snap.data.positions));
    await this.setState({ sim_day: day, sim_hour: 6, sim_minute: 0, ai_calls_today: 0 });
    return snap;
  }
  async reset(seed: Parameters<Store["reset"]>[0]) {
    for (const t of ["events", "memories", "relationships", "positions", "snapshots", "transactions", "residents", "locations"]) {
      this.unwrap(await this.db.from(t).delete().neq("id", "__none__"));
    }
    this.unwrap(await this.db.from("locations").insert(seed.locations));
    this.unwrap(await this.db.from("residents").insert(seed.residents));
    this.unwrap(await this.db.from("relationships").insert(seed.relationships));
    this.unwrap(await this.db.from("memories").insert(seed.memories));
    this.unwrap(await this.db.from("world").delete().gte("sim_day", 0));
    await this.setState({ sim_day: 1, sim_hour: 6, sim_minute: 0, ai_calls_today: 0 });
  }
}
