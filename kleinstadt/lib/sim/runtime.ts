import { getStore } from "@/lib/db";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";
import { seed } from "@/data/seed";

let running = false;
registerDefaultMocks();

export async function stepSim(ticks: number) {
  if (running) throw new Error("Simulation läuft bereits");
  running = true;
  try {
    const store = await getStore();
    return await new Engine(store).step(ticks);
  } finally {
    running = false;
  }
}

export async function resetSim() {
  const store = await getStore();
  await store.reset(seed());
  return store.getState();
}

export async function snapshot() {
  const store = await getStore();
  const [state, residents, locations, events, relationships] = await Promise.all([
    store.getState(), store.listResidents(), store.listLocations(), store.listEvents(150), store.listRelationships(),
  ]);
  const memories = Object.fromEntries(
    await Promise.all(residents.map(async (r) => [r.id, (await store.listMemories(r.id)).slice(-10).reverse()])),
  );
  return { state, residents, locations, events, relationships, memories, running };
}
