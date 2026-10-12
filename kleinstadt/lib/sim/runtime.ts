import { getStore } from "@/lib/db";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";
import { seed } from "@/data/seed";
import { ticksPerHour } from "@/lib/sim/movement";

export type Speed = 0 | 1 | 5 | 20;
const TICK_DELAY_MS: Record<Speed, number> = { 0: 0, 1: 2000, 5: 400, 20: 0 };

interface RuntimeState { engine: Engine | null; speed: Speed; busy: boolean; lastError: string | null }
/** Kept on globalThis: the Next dev server re-instantiates modules per route compile, and run/pause/step/stream must share one runtime. */
const g = globalThis as unknown as { __kleinstadtRuntime?: RuntimeState };
const rt: RuntimeState = (g.__kleinstadtRuntime ??= { engine: null, speed: 0, busy: false, lastError: null });
registerDefaultMocks();

export async function getEngine() {
  if (!rt.engine) {
    rt.engine = new Engine(await getStore());
    await rt.engine.placeResidents();
  }
  return rt.engine;
}
export const isRunning = () => rt.busy;

export async function stepSim(ticks: number) {
  if (rt.busy) throw new Error("Simulation läuft bereits");
  rt.busy = true;
  try { return await (await getEngine()).step(ticks); } finally { rt.busy = false; }
}

/** Runs ticks until pause or 24 simulated hours; returns immediately. */
export async function runSim(s: Speed) {
  rt.speed = s;
  if (rt.busy || s === 0) return;
  rt.busy = true;
  rt.lastError = null;
  const eng = await getEngine();
  const limit = 24 * ticksPerHour;
  (async () => {
    try {
      for (let i = 0; i < limit && rt.speed !== 0; i++) {
        await eng.step(1);
        const delay = TICK_DELAY_MS[rt.speed];
        if (delay) await new Promise((r) => setTimeout(r, delay));
      }
    } catch (err) {
      rt.lastError = (err as Error).message;
    } finally {
      rt.busy = false; rt.speed = 0;
    }
  })();
}

export function pauseSim() { rt.speed = 0; }

export async function resetSim() {
  pauseSim();
  const store = await getStore();
  await store.reset(seed());
  rt.engine = null;
  return store.getState();
}

export async function rewindSim(day: number) {
  if (rt.busy) throw new Error("Erst pausieren");
  const store = await getStore();
  const snap = await store.rewindTo(day);
  if (!snap) throw new Error(`Kein Snapshot für Tag ${day}`);
  rt.engine = null;
  return store.getState();
}

export async function snapshot() {
  const store = await getStore();
  const eng = await getEngine();
  const [state, residents, locations, events, relationships, positions, snapshots, map] = await Promise.all([
    store.getState(), store.listResidents(), store.listLocations(), store.listEvents(200, ["move"]), store.listRelationships(),
    store.listPositions(), store.listSnapshots(), eng.getMap(),
  ]);
  const world = await store.getWorld(state.sim_day);
  const transactions = (await store.listTransactions(state.sim_day)).slice(-30).reverse();
  const newspapers = await store.listNewspapers();
  const memories = Object.fromEntries(
    await Promise.all(residents.map(async (r) => [r.id, (await store.listMemories(r.id)).slice(-10).reverse()])),
  );
  return {
    state, residents, locations, events, relationships, memories, positions, world, transactions, newspapers,
    snapshots: snapshots.map((s) => s.sim_day), running: rt.busy, speed: rt.speed, error: rt.lastError,
    map: { width: map.width, height: map.height, cells: map.cells, places: map.places },
  };
}
