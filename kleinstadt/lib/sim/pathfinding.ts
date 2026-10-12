import { isWalkable, stepCost, type Point, type TownMap } from "./map";

const key = (p: Point) => p.y * 1000 + p.x;

/** A* over the grid, 4-neighbourhood, green cells cost 1.5. Returns the cells after `from`, ending at `to`. */
export function findPath(map: TownMap, from: Point, to: Point): Point[] | null {
  if (!isWalkable(map, from) || !isWalkable(map, to)) return null;
  const open = new Map<number, Point>([[key(from), from]]);
  const came = new Map<number, number>();
  const g = new Map<number, number>([[key(from), 0]]);
  const f = new Map<number, number>([[key(from), heuristic(from, to)]]);

  while (open.size) {
    let current!: Point, best = Infinity;
    for (const [k, p] of open) { const v = f.get(k) ?? Infinity; if (v < best) { best = v; current = p; } }
    if (current.x === to.x && current.y === to.y) return rebuild(came, current);
    open.delete(key(current));
    for (const n of neighbours(current)) {
      if (!isWalkable(map, n)) continue;
      const tentative = (g.get(key(current)) ?? Infinity) + stepCost(map, n);
      if (tentative < (g.get(key(n)) ?? Infinity)) {
        came.set(key(n), key(current));
        g.set(key(n), tentative);
        f.set(key(n), tentative + heuristic(n, to));
        open.set(key(n), n);
      }
    }
  }
  return null;
}

const heuristic = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const neighbours = (p: Point): Point[] => [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }];

function rebuild(came: Map<number, number>, end: Point): Point[] {
  const path: Point[] = [];
  let k: number | undefined = key(end);
  while (k !== undefined && came.has(k)) {
    path.push({ x: k % 1000, y: Math.floor(k / 1000) });
    k = came.get(k);
  }
  return path.reverse();
}

export const adjacent = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1;
