import type { Store } from "@/lib/db/store";
import type { Weather, World } from "@/lib/types";
import type { Rng } from "./agent";

export const WEATHERS: Weather[] = ["sonnig", "bewölkt", "Regen"];

/** Transition matrix from SPEC-PHASE3: rows = today, columns = tomorrow (sonnig, bewölkt, Regen). */
export const TRANSITIONS: Record<Weather, [number, number, number]> = {
  sonnig: [0.6, 0.3, 0.1],
  bewölkt: [0.3, 0.4, 0.3],
  Regen: [0.2, 0.4, 0.4],
};

export function nextWeather(today: Weather | null, rng: Rng): Weather {
  const row = today ? TRANSITIONS[today] : [0.4, 0.37, 0.23];
  const roll = rng();
  let acc = 0;
  for (let i = 0; i < WEATHERS.length; i++) { acc += row[i]; if (roll < acc) return WEATHERS[i]; }
  return WEATHERS[2];
}

export async function rollWorld(store: Store, day: number, rng: Rng): Promise<World> {
  const existing = await store.getWorld(day);
  if (existing) return existing;
  const yesterday = await store.getWorld(day - 1);
  const weather = nextWeather(yesterday?.weather ?? null, rng);
  const base = { sonnig: 22, bewölkt: 17, Regen: 13 }[weather];
  const world: World = { sim_day: day, weather, temperature: base + Math.round((rng() - 0.5) * 6) };
  await store.setWorld(world);
  return world;
}

export const weatherSentence = (w: World) =>
  ({ sonnig: `Es ist ein sonniger Tag, ${w.temperature} Grad.`, bewölkt: `Der Himmel ist bedeckt, ${w.temperature} Grad.`, Regen: `Es regnet den ganzen Tag, ${w.temperature} Grad.` })[w.weather];

/** Walking speed factor and street-talk factor for the day. */
export const weatherEffects = (w: World | null) => ({
  speed: w?.weather === "Regen" ? 1.3 : 1,
  streetTalk: w?.weather === "Regen" ? 0.5 : 1,
  parkBonus: w?.weather === "sonnig" ? 0.2 : 0,
});

/** Sun elevation 0..1 and a light colour for the renderer: first light 5, peak 13, dark at 21, so the day's first frame at 06:00 is dawn, not night. */
export function sunState(hour: number, minute: number) {
  const t = hour + minute / 60;
  const elevation = t <= 5 || t >= 21 ? 0 : Math.sin(((t - 5) / 16) * Math.PI);
  const phase = elevation === 0 ? "night" : elevation < 0.35 ? "golden" : "day";
  const color = phase === "night" ? "#2b3a5c" : phase === "golden" ? "#ffb878" : "#fff6e0";
  return { elevation, phase, color } as const;
}
