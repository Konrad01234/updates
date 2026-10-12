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
  // park: a green block south-east with its gate on the road
  places.park = { entrance: { x: 48, y: 30 }, footprint: [] };
  for (let y = 29; y < 38; y++) for (let x = 40; x < 56; x++) if (cells[y][x] === "green") cells[y][x] = "green";
  places.markt = { entrance: { x: 30, y: 20 }, footprint: [] };

  // homes: two columns west of the first road, each a 3x2 house with its door on the road
  const uniqueHomes = [...new Set(homeIds)];
  uniqueHomes.forEach((id, i) => {
    const y0 = 4 + i * 4;
    if (y0 + 2 > MAP_H - 2) throw new Error("too many homes for the west column");
    building(id, 8, y0, 3, 2, { x: 12, y: y0 });
    for (let x = 11; x < 12; x++) cells[y0][x] = "road"; // short driveway
  });
  return { width: MAP_W, height: MAP_H, cells, places };
}

export const isWalkable = (map: TownMap, p: Point) =>
  p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height && map.cells[p.y][p.x] !== "building";

/** Movement cost: roads 1, green 1.5. */
export const stepCost = (map: TownMap, p: Point) => (map.cells[p.y][p.x] === "green" ? 1.5 : 1);
