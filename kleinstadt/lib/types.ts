export type LocationType = "home" | "work" | "cafe" | "park" | "shop" | "square";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  open_hour: number;
  close_hour: number;
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
}

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

export type EventType = "move" | "talk" | "action" | "reflect";

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
  ai_calls_today: number;
}

export const DAY_START = 6;
export const DAY_END = 23;
export const EMBEDDING_DIM = 512;
