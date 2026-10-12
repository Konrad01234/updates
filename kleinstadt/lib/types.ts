export type LocationType = "home" | "work" | "cafe" | "park" | "shop" | "square";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  open_hour: number;
  close_hour: number;
  /** Phase 3 economy */
  owner_id: string | null;
  balance: number;
  price: number;
  daily_cost: number;
  days_in_loss: number;
  status: "open" | "closed";
}

export interface PlanEntry {
  hour: number;
  location_id: string;
  activity: string;
}

export interface Resident {
  id: string;
  name: string;
  age: number;
  job: string;
  home_id: string;
  work_id: string | null;
  personality: string;
  goals: string[];
  daily_plan: PlanEntry[];
  current_location_id: string | null;
  current_action: string;
  /** Phase 3 economy */
  balance: number;
  daily_wage: number;
  employer_id: string | null;
}

export type Weather = "sonnig" | "bewölkt" | "Regen";

export interface World {
  sim_day: number;
  weather: Weather;
  temperature: number;
}

export interface Transaction {
  id: number;
  sim_day: number;
  from_id: string;
  to_id: string;
  amount: number;
  reason: string;
}

export const CITY_ACCOUNT = "stadt";

export type MemoryKind = "observation" | "conversation" | "reflection";

export interface Memory {
  id: number;
  resident_id: string;
  kind: MemoryKind;
  content: string;
  importance: number;
  sim_day: number;
  sim_hour: number;
  embedding: number[] | null;
  last_accessed: number;
}

export interface Relationship {
  resident_id: string;
  other_id: string;
  score: number;
  label: string;
  updated_day: number;
}

export type EventType = "move" | "talk" | "action" | "reflect" | "economy" | "weather";

export interface Turn {
  speaker: string;
  text: string;
}

export interface SimEvent {
  id: number;
  sim_day: number;
  sim_hour: number;
  type: EventType;
  resident_ids: string[];
  location_id: string | null;
  summary: string;
  transcript: Turn[] | null;
}

export interface SimState {
  sim_day: number;
  sim_hour: number;
  /** 0, 10, 20, 30, 40, 50 (Phase 2: ten-minute ticks) */
  sim_minute: number;
  ai_calls_today: number;
}

export interface Position {
  resident_id: string;
  x: number;
  y: number;
  /** remaining cells to walk; empty = at the entrance of current_location_id */
  path: { x: number; y: number }[];
  /** destination while walking */
  target_location_id: string | null;
  paused_ticks: number;
  street_talks_this_trip: number;
}

export interface Snapshot {
  sim_day: number;
  created_at: string;
  data: { residents: Resident[]; relationships: Relationship[]; positions: Position[]; max_memory_id: number; locations?: Location[] };
}

export const DAY_START = 6;
export const DAY_END = 23;
export const EMBEDDING_DIM = 512;
export const TICK_MINUTES = 10;
export const CELLS_PER_TICK = 10;
export const CELLS_PER_TICK_GREEN = 7;
