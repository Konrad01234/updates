import { describe, expect, it } from "vitest";
import { buildMap } from "@/lib/sim/map";
import { findPath } from "@/lib/sim/pathfinding";
import { travelTicks } from "@/lib/sim/movement";
import { seed } from "@/data/seed";

const s = seed();
const map = buildMap(s.residents.map((r) => r.home_id));

describe("map and pathfinding", () => {
  it("has an entrance on a road for every location", () => {
    for (const loc of s.locations) {
      const place = map.places[loc.id];
      expect(place, loc.id).toBeDefined();
      expect(map.cells[place.entrance.y][place.entrance.x]).toBe("road");
    }
  });

  it("finds a path between every pair of places without crossing a building", () => {
    const ids = Object.keys(map.places);
    let pairs = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const path = findPath(map, map.places[ids[i]].entrance, map.places[ids[j]].entrance);
      expect(path, `${ids[i]} -> ${ids[j]}`).not.toBeNull();
      for (const p of path!) expect(map.cells[p.y][p.x]).not.toBe("building");
      pairs++;
    }
    expect(pairs).toBeGreaterThanOrEqual(15);
  });

  it("longest trip home -> school takes under an hour", () => {
    const path = findPath(map, map.places.home_martha.entrance, map.places.schule.entrance)!;
    expect(path.length).toBeGreaterThan(30);
    expect(travelTicks(map, path)).toBeLessThanOrEqual(6);
  });
});
