import type { Position, Resident } from "@/lib/types";
import { CELLS_PER_TICK, CELLS_PER_TICK_GREEN } from "@/lib/types";
import type { TownMap, Point } from "./map";
import { findPath } from "./pathfinding";

export const ticksPerHour = 6;

export function entranceOf(map: TownMap, locationId: string): Point {
  const place = map.places[locationId];
  if (!place) throw new Error(`no place on the map for ${locationId}`);
  return place.entrance;
}

/** Ticks needed to walk a path at 10 cells per tick (7 on green); a cell is about 20 m. */
export function travelTicks(map: TownMap, path: Point[]): number {
  let ticks = 0, budget = 0;
  for (const p of path) {
    const speed = map.cells[p.y][p.x] === "green" ? CELLS_PER_TICK_GREEN : CELLS_PER_TICK;
    if (budget <= 0) { ticks++; budget = speed; }
    budget--;
  }
  return ticks;
}

export function initialPosition(map: TownMap, r: Resident): Position {
  const e = entranceOf(map, r.home_id);
  return { resident_id: r.id, x: e.x, y: e.y, path: [], target_location_id: null, paused_ticks: 0, street_talks_this_trip: 0 };
}

/** Starts a trip if the resident must leave now to arrive by `arriveInTicks`. Returns true when walking began. */
export function maybeDepart(map: TownMap, pos: Position, from: Point, targetId: string, arriveInTicks: number): boolean {
  const path = findPath(map, from, entranceOf(map, targetId));
  if (!path) return false;
  if (travelTicks(map, path) < arriveInTicks) return false;
  pos.path = path;
  pos.target_location_id = targetId;
  pos.street_talks_this_trip = 0;
  return true;
}

/** Advances one tick along the path. Returns the location id on arrival, else null. */
export function walk(map: TownMap, pos: Position, speedFactor = 1): string | null {
  if (pos.paused_ticks > 0) { pos.paused_ticks--; return null; }
  let budget = CELLS_PER_TICK * speedFactor;
  while (pos.path.length && budget > 0) {
    const next = pos.path.shift()!;
    pos.x = next.x; pos.y = next.y;
    budget -= map.cells[next.y][next.x] === "green" ? CELLS_PER_TICK / CELLS_PER_TICK_GREEN : 1;
  }
  if (pos.path.length === 0 && pos.target_location_id) {
    const arrived = pos.target_location_id;
    pos.target_location_id = null;
    return arrived;
  }
  return null;
}

export const isWalking = (pos: Position) => pos.path.length > 0;
