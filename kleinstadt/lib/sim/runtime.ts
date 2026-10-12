import { getStore } from "@/lib/db";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";
import { seed } from "@/data/seed";
import { ticksPerHour } from "@/lib/sim/movement";

export type Speed = 0 | 1 | 5 | 20;
const TICK_DELAY_MS: Record<Speed, number> = { 0: 0, 1: 2000, 5: 400, 20: 0 };

let engine: Engine | null = null;
let speed: Speed = 0;
let busy = false;
let lastError: string | null = null;
registerDefaultMocks();

async function getEngine() {
  if (!engine) engine = new Engine(await getStore());
  return engine;
}

export async function stepSim(ticks: number) {
  if (busy) throw new Error("Simulation läuft bereits");
  busy = true;
  try { return await (await getEngine()).step(ticks); } finally { busy = false; }
}

/** Runs ticks until pause or 24 simulated hours; returns immediately. */
export async function runSim(s: Speed) {
  speed = s;
  if (busy || s === 0) return;
  busy = true;
  lastError = null;
  const eng = await getEngine();
  const limit = 24 * ticksPerHour;
  (async () => {
    try {
      for (let i = 0; i < limit && speed !== 0; i++) {
        await eng.step(1);
        const delay = TICK_DELAY_MS[speed];
        if (delay) await new Promise((r) => setTimeout(r, delay));
      }
    } catch (err) {
      lastError = (err as Error).message;
    } finally {
      busy = false; speed = 0;
    }
  })();
}

export function pauseSim() { speed = 0; }

export async function resetSim() {
  pauseSim();
  const store = await getStore();
  await store.reset(seed());
  engine = null;
  return store.getState();
}

export async function rewindSim(day: number) {
  if (busy) throw new Error("Erst pausieren");
  const store = await getStore();
  const snap = await store.rewindTo(day);
  if (!snap) throw new Error(`Kein Snapshot für Tag ${day}`);
  engine = null;
  return store.getState();
}

export async function snapshot() {
  const store = await getStore();
  const eng = await getEngine();
  const [state, residents, locations, events, relationships, positions, snapshots, map] = await Promise.all([
    store.getState(), store.listResidents(), store.listLocations(), store.listEvents(150), store.listRelationships(),
    store.listPositions(), store.listSnapshots(), eng.getMap(),
  ]);
  const memories = Object.fromEntries(
    await Promise.all(residents.map(async (r) => [r.id, (await store.listMemories(r.id)).slice(-10).reverse()])),
  );
  return {
    state, residents, locations, events, relationships, memories, positions,
    snapshots: snapshots.map((s) => s.sim_day), running: busy, speed, error: lastError,
    map: { width: map.width, height: map.height, cells: map.cells, places: map.places },
  };
}
