import type { Location, Memory, Position, Relationship, Resident, SimEvent, SimState, Snapshot } from "@/lib/types";

/** Storage abstraction: in-memory for tests and dry runs, Supabase in production. */
export interface Store {
  getState(): Promise<SimState>;
  setState(state: SimState): Promise<void>;
  listLocations(): Promise<Location[]>;
  listResidents(): Promise<Resident[]>;
  updateResident(id: string, patch: Partial<Resident>): Promise<void>;
  listMemories(residentId: string): Promise<Memory[]>;
  addMemory(m: Omit<Memory, "id">): Promise<Memory>;
  touchMemories(ids: number[], simDay: number): Promise<void>;
  listRelationships(): Promise<Relationship[]>;
  upsertRelationship(r: Relationship): Promise<void>;
  addEvent(e: Omit<SimEvent, "id">): Promise<SimEvent>;
  listEvents(limit?: number): Promise<SimEvent[]>;
  listPositions(): Promise<Position[]>;
  setPosition(p: Position): Promise<void>;
  saveSnapshot(s: Snapshot): Promise<void>;
  listSnapshots(): Promise<Snapshot[]>;
  /** Deletes memories and events with sim_day >= day and restores the snapshot of that day. */
  rewindTo(day: number): Promise<Snapshot | null>;
  reset(seed: { locations: Location[]; residents: Resident[]; relationships: Relationship[]; memories: Omit<Memory, "id">[] }): Promise<void>;
}

export class InMemoryStore implements Store {
  private state: SimState = { sim_day: 1, sim_hour: 6, sim_minute: 0, ai_calls_today: 0 };
  private positions = new Map<string, Position>();
  private snapshots = new Map<number, Snapshot>();
  private locations: Location[] = [];
  private residents: Resident[] = [];
  private memories: Memory[] = [];
  private relationships = new Map<string, Relationship>();
  private events: SimEvent[] = [];
  private nextId = 1;

  async getState() { return { ...this.state }; }
  async setState(state: SimState) { this.state = { ...state }; }
  async listLocations() { return this.locations.map((l) => ({ ...l })); }
  async listResidents() { return this.residents.map((r) => ({ ...r })); }
  async updateResident(id: string, patch: Partial<Resident>) {
    const r = this.residents.find((x) => x.id === id);
    if (!r) throw new Error(`resident ${id} not found`);
    Object.assign(r, patch);
  }
  async listMemories(residentId: string) {
    return this.memories.filter((m) => m.resident_id === residentId).map((m) => ({ ...m }));
  }
  async addMemory(m: Omit<Memory, "id">) {
    const mem = { ...m, id: this.nextId++ };
    this.memories.push(mem);
    return { ...mem };
  }
  async touchMemories(ids: number[], simDay: number) {
    for (const m of this.memories) if (ids.includes(m.id)) m.last_accessed = simDay;
  }
  async listRelationships() { return [...this.relationships.values()].map((r) => ({ ...r })); }
  async upsertRelationship(r: Relationship) {
    this.relationships.set(`${r.resident_id}->${r.other_id}`, { ...r });
  }
  async addEvent(e: Omit<SimEvent, "id">) {
    const ev = { ...e, id: this.nextId++ };
    this.events.push(ev);
    return { ...ev };
  }
  async listEvents(limit = 200) { return this.events.slice(-limit).reverse(); }
  async listPositions() { return [...this.positions.values()].map((p) => ({ ...p, path: [...p.path] })); }
  async setPosition(p: Position) { this.positions.set(p.resident_id, { ...p, path: [...p.path] }); }
  async saveSnapshot(s: Snapshot) { this.snapshots.set(s.sim_day, structuredClone(s)); }
  async listSnapshots() { return [...this.snapshots.values()].sort((a, b) => a.sim_day - b.sim_day); }
  async rewindTo(day: number) {
    const snap = this.snapshots.get(day);
    if (!snap) return null;
    this.memories = this.memories.filter((m) => m.sim_day < day && m.id <= snap.data.max_memory_id);
    this.events = this.events.filter((e) => e.sim_day < day);
    for (const d of [...this.snapshots.keys()]) if (d > day) this.snapshots.delete(d);
    this.residents = structuredClone(snap.data.residents);
    this.relationships = new Map(snap.data.relationships.map((r) => [`${r.resident_id}->${r.other_id}`, { ...r }]));
    this.positions = new Map(snap.data.positions.map((p) => [p.resident_id, structuredClone(p)]));
    this.state = { sim_day: day, sim_hour: 6, sim_minute: 0, ai_calls_today: 0 };
    return structuredClone(snap);
  }
  async reset(seed: Parameters<Store["reset"]>[0]) {
    this.state = { sim_day: 1, sim_hour: 6, sim_minute: 0, ai_calls_today: 0 };
    this.positions = new Map();
    this.snapshots = new Map();
    this.locations = seed.locations.map((l) => ({ ...l }));
    this.residents = seed.residents.map((r) => ({ ...r }));
    this.relationships = new Map();
    for (const r of seed.relationships) await this.upsertRelationship(r);
    this.memories = [];
    this.events = [];
    this.nextId = 1;
    for (const m of seed.memories) await this.addMemory(m);
  }
}
