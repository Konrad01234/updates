import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { backfillRelationshipHistory } from "@/lib/sim/history";
export const dynamic = "force-dynamic";

/** GET ?day=N → relationship scores of that day (live state for the current day). */
export async function GET(req: Request) {
  const store = await getStore();
  const state = await store.getState();
  const day = Number(new URL(req.url).searchParams.get("day") ?? state.sim_day);
  await backfillRelationshipHistory(store, state.sim_day);
  const rows = day >= state.sim_day ? (await store.listRelationships()).map((r) => ({ resident_id: r.resident_id, other_id: r.other_id, score: r.score, label: r.label }))
    : await store.listRelationshipHistory(day);
  const residents = (await store.listResidents()).map((r) => ({ id: r.id, name: r.name }));
  return NextResponse.json({ day, maxDay: state.sim_day, residents, edges: rows });
}
