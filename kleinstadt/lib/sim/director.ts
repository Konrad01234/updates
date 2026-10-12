import type { Store } from "@/lib/db/store";
import type { Location, Relationship, Resident } from "@/lib/types";
import { CITY_ACCOUNT } from "@/lib/types";
import { callJson, type AiBudget } from "@/lib/ai/client";
import { DirectorSchema, type Operation } from "@/lib/ai/schemas";
import { directorPrompt } from "@/lib/ai/prompts/director";
import { remember } from "./memory";
import { placeNewBuilding, type TownMap } from "./map";
import { initialPosition } from "./movement";

export interface Proposal { operations: Operation[]; summary: string; preview: string[] }

/** Step 1: the director turns free text into operations; nothing is written yet. */
export async function proposeIntervention(store: Store, text: string, scope: string, day: number, budget: AiBudget): Promise<Proposal> {
  const [residents, locations, world] = await Promise.all([store.listResidents(), store.listLocations(), store.getWorld(day)]);
  const res = await callJson("director", { role: "director", maxTokens: 4000, ...directorPrompt(text, scope, residents, locations, world, day) }, DirectorSchema, budget);
  const names = new Map<string, string>([...residents.map((r): [string, string] => [r.id, r.name]), ...locations.map((l): [string, string] => [l.id, l.name])]);
  const n = (id: string) => names.get(id) ?? id;
  const preview = res.operations.map((o) => {
    switch (o.op) {
      case "close_location": return `${n(o.location_id)} wird geschlossen (${o.reason})`;
      case "open_location": return `Neuer Ort: ${o.name} (${o.type})`;
      case "add_resident": return `${o.resident.name} zieht ein (${o.resident.job})`;
      case "remove_resident": return `${n(o.resident_id)} zieht weg (${o.reason})`;
      case "set_weather": return `Wetter: ${o.weather} für ${o.days} Tage`;
      case "transfer_money": return `${o.amount} € von ${n(o.from_id)} an ${n(o.to_id)} (${o.reason})`;
      case "set_relationship": return `${n(o.from_id)} → ${n(o.to_id)}: ${o.delta > 0 ? "+" : ""}${o.delta} (${o.reason})`;
      case "add_memory": return `Erinnerung für ${n(o.resident_id)}: „${o.content}“`;
    }
  });
  return { operations: res.operations, summary: res.summary, preview };
}

/** Step 2: applies confirmed operations. Validates ids against the current state; unknown ids throw before anything is written. */
export async function applyIntervention(store: Store, map: TownMap, text: string, ops: Operation[], summary: string, day: number, hour: number): Promise<void> {
  const residents = new Map((await store.listResidents()).map((r) => [r.id, r]));
  const locations = new Map((await store.listLocations()).map((l) => [l.id, l]));
  const rels = new Map((await store.listRelationships()).map((r) => [`${r.resident_id}->${r.other_id}`, r]));
  const pendingLocations = new Set<string>();
  const pendingResidents = new Set<string>();

  // validation pass
  for (const o of ops) {
    const hasRes = (id: string) => residents.has(id) || pendingResidents.has(id) || id === CITY_ACCOUNT;
    const hasLoc = (id: string) => locations.has(id) || pendingLocations.has(id);
    switch (o.op) {
      case "close_location": if (!hasLoc(o.location_id)) throw new Error(`Unbekannter Ort ${o.location_id}`); break;
      case "open_location": pendingLocations.add(slug(o.name)); break;
      case "add_resident":
        if (residents.has(o.resident.id)) throw new Error(`Bewohner ${o.resident.id} existiert schon`);
        if (!hasLoc(o.resident.home_id)) throw new Error(`Unbekanntes Zuhause ${o.resident.home_id}`);
        pendingResidents.add(o.resident.id); break;
      case "remove_resident": if (!residents.has(o.resident_id)) throw new Error(`Unbekannter Bewohner ${o.resident_id}`); break;
      case "transfer_money": if (!hasRes(o.from_id) && !hasLoc(o.from_id)) throw new Error(`Unbekanntes Konto ${o.from_id}`); if (!hasRes(o.to_id) && !hasLoc(o.to_id)) throw new Error(`Unbekanntes Konto ${o.to_id}`); break;
      case "set_relationship": if (!hasRes(o.from_id) || !hasRes(o.to_id)) throw new Error("Unbekannte Person in set_relationship"); break;
      case "add_memory": if (!hasRes(o.resident_id)) throw new Error(`Unbekannter Bewohner ${o.resident_id}`); break;
    }
  }

  const touched = new Set<string>();
  for (const o of ops) {
    switch (o.op) {
      case "close_location": {
        const l = locations.get(o.location_id)!;
        await store.updateLocation(l.id, { status: "closed" });
        l.status = "closed";
        for (const r of residents.values()) if (r.employer_id === l.id || r.work_id === l.id) {
          await store.updateResident(r.id, { employer_id: null, work_id: null, daily_wage: 30 });
          await remember(store, r.id, "observation", `${l.name} ist geschlossen: ${o.reason}. Meinen Arbeitsplatz dort gibt es nicht mehr.`, 8, day, hour);
          touched.add(r.id);
        }
        break;
      }
      case "open_location": {
        const id = slug(o.name);
        const place = ["shop", "cafe", "work"].includes(o.type) ? placeNewBuilding(map, id) : null;
        if (!place && ["shop", "cafe", "work"].includes(o.type)) throw new Error("Kein freies Grundstück");
        if (!place) map.places[id] = { entrance: map.places.markt.entrance, footprint: [] };
        const loc: Location = { id, name: o.name, type: o.type, description: "", open_hour: 8, close_hour: 20, owner_id: o.owner_id, balance: 0, price: o.price, daily_cost: o.daily_cost, days_in_loss: 0, status: "open" };
        await store.addLocation(loc); locations.set(id, loc);
        break;
      }
      case "add_resident": {
        const p = o.resident;
        const r: Resident = { id: p.id, name: p.name, age: p.age, job: p.job, home_id: p.home_id, work_id: p.work_id, personality: p.personality, goals: p.goals,
          daily_plan: defaultPlan(p.home_id, p.work_id), current_location_id: p.home_id, current_action: "angekommen", balance: p.balance, daily_wage: p.daily_wage, employer_id: p.employer_id };
        await store.addResident(r); residents.set(r.id, r);
        await store.setPosition(initialPosition(map, r));
        for (const m of p.memories) await remember(store, r.id, "observation", m.content, m.importance, day, hour);
        for (const rel of p.relationships) if (residents.has(rel.other_id)) {
          await store.upsertRelationship({ resident_id: r.id, other_id: rel.other_id, score: rel.score, label: rel.label, updated_day: day });
        }
        touched.add(r.id);
        break;
      }
      case "remove_resident": {
        const r = residents.get(o.resident_id)!;
        for (const l of locations.values()) if (l.owner_id === r.id) await store.updateLocation(l.id, { owner_id: null });
        await store.removeResident(r.id); residents.delete(r.id);
        break;
      }
      case "set_weather": {
        for (let d = 0; d < o.days; d++) await store.setWorld({ sim_day: day + d, weather: o.weather, temperature: { sonnig: 22, bewölkt: 17, Regen: 13 }[o.weather] });
        break;
      }
      case "transfer_money": {
        const take = async (id: string, amt: number) => {
          if (id === CITY_ACCOUNT) return;
          const r = residents.get(id); if (r) { r.balance -= amt; await store.updateResident(id, { balance: r.balance }); return; }
          const l = locations.get(id)!; l.balance -= amt; await store.updateLocation(id, { balance: l.balance });
        };
        await take(o.from_id, o.amount); await take(o.to_id, -o.amount);
        await store.addTransaction({ sim_day: day, from_id: o.from_id, to_id: o.to_id, amount: o.amount, reason: o.reason });
        break;
      }
      case "set_relationship": {
        const key = `${o.from_id}->${o.to_id}`;
        const prev = rels.get(key) ?? { resident_id: o.from_id, other_id: o.to_id, score: 0, label: "", updated_day: day };
        const next: Relationship = { ...prev, score: Math.max(-100, Math.min(100, prev.score + o.delta)), label: o.reason, updated_day: day };
        rels.set(key, next); await store.upsertRelationship(next);
        break;
      }
      case "add_memory":
        await remember(store, o.resident_id, "observation", o.content, o.importance, day, hour);
        touched.add(o.resident_id);
        break;
    }
  }
  await store.addEvent({ sim_day: day, sim_hour: hour, type: "divine", resident_ids: [...touched], location_id: null, summary: `Eingriff: ${text} – ${summary}`, transcript: null });
}

const slug = (name: string) => "loc_" + name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function defaultPlan(home: string, work: string | null) {
  return Array.from({ length: 18 }, (_, i) => {
    const hour = 6 + i;
    const atWork = work && hour >= 8 && hour < 17;
    return { hour, location_id: atWork ? work! : hour < 9 || hour > 20 ? home : "markt", activity: atWork ? "arbeitet" : "sich umsehen" };
  });
}
