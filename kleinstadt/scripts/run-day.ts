/**
 * Simulates whole days in the terminal.
 *   npx tsx scripts/run-day.ts            one day, mock mode unless keys are set
 *   npx tsx scripts/run-day.ts 3          three days
 *   SKIP_AI=true npx tsx scripts/run-day.ts   movement and encounters only (Phase 1, steps 1–4)
 */
import { InMemoryStore } from "@/lib/db/store";
import { seed } from "@/data/seed";
import { Engine } from "@/lib/sim/engine";
import { registerDefaultMocks } from "@/lib/ai/mock";

async function main() {
  const days = Number(process.argv[2] ?? 1);
  registerDefaultMocks();
  const store = new InMemoryStore();
  await store.reset(seed());
  const engine = new Engine(store, { skipAi: process.env.SKIP_AI === "true" });
  for (let d = 0; d < days; d++) await engine.stepDay();
  const events = (await store.listEvents(5000)).reverse();
  const counts = events.reduce<Record<string, number>>((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {});
  console.log(`\n${days} Tag(e) simuliert. Events:`, counts);
  for (const e of events.filter((e) => e.type !== "move").slice(0, 25)) {
    console.log(`Tag ${e.sim_day} ${String(e.sim_hour).padStart(2, "0")}:00  ${e.summary}`);
  }
  console.log("\nWirtschaft und Wetter:");
  for (const e of events.filter((e) => e.type === "economy" || e.type === "weather")) console.log(`Tag ${e.sim_day} ${String(e.sim_hour).padStart(2, "0")}:00  ${e.summary}`);
  const world = await store.getWorld((await store.getState()).sim_day - 1);
  const residents = await store.listResidents();
  console.log("\nKontostände:", residents.map((r) => `${r.name.split(" ")[0]} ${Math.round(r.balance)} €`).join(", "));
  if (world) console.log("Letztes Wetter:", world.weather, world.temperature, "Grad");
  const state = await store.getState();
  console.log(`\nStand: Tag ${state.sim_day}, ${state.sim_hour}:${String(state.sim_minute).padStart(2, "0")} Uhr`);
}

main().catch((err) => { console.error(err); process.exit(1); });
