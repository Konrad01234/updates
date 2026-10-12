import type { Location, Memory, Relationship, Resident, SimEvent, SimState } from "@/lib/types";

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
  reset(seed: { locations: Location[]; residents: Resident[]; relationships: Relationship[]; memories: Omit<Memory, "id">[] }): Promise<void>;
}

export class InMemoryStore implements Store {
  private state: SimState = { sim_day: 1, sim_hour: 6, ai_calls_today: 0 };
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
  async reset(seed: Parameters<Store["reset"]>[0]) {
    this.state = { sim_day: 1, sim_hour: 6, ai_calls_today: 0 };
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
