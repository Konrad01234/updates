export type Cell = "road" | "building" | "green";
export const MAP_W = 60;
export const MAP_H = 40;

export interface Point { x: number; y: number }

export interface TownMap {
  width: number;
  height: number;
  cells: Cell[][]; // cells[y][x]
  /** location id → entrance (a road cell) and building footprint */
  places: Record<string, { entrance: Point; footprint: Point[] }>;
}

const ROADS_X = [12, 24, 36, 48];
const ROADS_Y = [12, 20, 28];

/** Lindenbach: homes west, market centre, school north-east, park south-east. */
export function buildMap(homeIds: string[]): TownMap {
  const cells: Cell[][] = Array.from({ length: MAP_H }, () => Array<Cell>(MAP_W).fill("green"));
  for (const x of ROADS_X) for (let y = 2; y < MAP_H - 2; y++) cells[y][x] = "road";
  for (const y of ROADS_Y) for (let x = 2; x < MAP_W - 2; x++) cells[y][x] = "road";
  // market square: paved block around the central crossing
  for (let y = 17; y <= 23; y++) for (let x = 26; x <= 34; x++) cells[y][x] = "road";

  const places: TownMap["places"] = {};
  const building = (id: string, x0: number, y0: number, w: number, h: number, entrance: Point) => {
    const footprint: Point[] = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { cells[y][x] = "building"; footprint.push({ x, y }); }
    if (cells[entrance.y][entrance.x] !== "road") throw new Error(`entrance of ${id} is not on a road`);
    places[id] = { entrance, footprint };
  };

  building("baeckerei", 26, 13, 4, 3, { x: 27, y: 12 });
  building("cafe", 31, 13, 4, 3, { x: 32, y: 12 });
  building("schule", 40, 4, 6, 5, { x: 43, y: 12 });
  building("kiosk", 37, 21, 3, 2, { x: 36, y: 22 });
  building("friseur", 26, 29, 4, 3, { x: 27, y: 28 });
  places.bus = { entrance: { x: 48, y: 4 }, footprint: [] };
  for (let y = 4; y < 6; y++) cells[y][48] = "road";
  places.park2 = { entrance: { x: 12, y: 36 }, footprint: [] };
  // free lots for new shops founded during the simulation (Phase 3)
  places.__lots = { entrance: { x: 0, y: 0 }, footprint: [{ x: 38, y: 13 }, { x: 38, y: 29 }, { x: 50, y: 21 }] };
  // park: a green block south-east with its gate on the road
  places.park = { entrance: { x: 48, y: 30 }, footprint: [] };
  for (let y = 29; y < 38; y++) for (let x = 40; x < 56; x++) if (cells[y][x] === "green") cells[y][x] = "green";
  places.markt = { entrance: { x: 30, y: 20 }, footprint: [] };

  // homes: two columns along the first road, each a 3x2 house with its door on the road
  const uniqueHomes = [...new Set(homeIds)].filter((id) => !places[id]);
  uniqueHomes.forEach((id, i) => {
    const row = Math.floor(i / 2), east = i % 2 === 1;
    const y0 = 3 + row * 4;
    if (y0 + 2 > MAP_H - 2) throw new Error("too many homes along the west road");
    if (east) { building(id, 14, y0, 3, 2, { x: 12, y: y0 + 1 }); cells[y0 + 1][13] = "road"; }
    else { building(id, 8, y0, 3, 2, { x: 12, y: y0 }); cells[y0][11] = "road"; }
  });
  return { width: MAP_W, height: MAP_H, cells, places };
}

/** Adds a 3x2 building on a free lot; returns the new place or null when no lot is left. */
export function placeNewBuilding(map: TownMap, id: string): { entrance: Point; footprint: Point[] } | null {
  const lots = map.places.__lots?.footprint ?? [];
  for (const lot of lots) {
    const footprint = [0, 1, 2].flatMap((dx) => [0, 1].map((dy) => ({ x: lot.x + dx, y: lot.y + dy })));
    if (!footprint.every((p) => map.cells[p.y]?.[p.x] === "green")) continue;
    for (const p of footprint) map.cells[p.y][p.x] = "building";
    const entrance = { x: lot.x - 1, y: lot.y };
    if (map.cells[entrance.y][entrance.x] !== "road") map.cells[entrance.y][entrance.x] = "road";
    for (let x = entrance.x; x >= 0 && map.cells[entrance.y][x] !== "road"; x--) map.cells[entrance.y][x] = "road";
    map.places[id] = { entrance, footprint };
    return map.places[id];
  }
  return null;
}

export const isWalkable = (map: TownMap, p: Point) =>
  p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height && map.cells[p.y][p.x] !== "building";

/** Movement cost: roads 1, green 1.5. */
export const stepCost = (map: TownMap, p: Point) => (map.cells[p.y][p.x] === "green" ? 1.5 : 1);
