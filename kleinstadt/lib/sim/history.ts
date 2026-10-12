import type { Store } from "@/lib/db/store";

/** 23:00: one row per relationship and day. */
export async function recordRelationshipHistory(store: Store, day: number) {
  const rels = await store.listRelationships();
  await store.addRelationshipHistory(rels.map((r) => ({ sim_day: day, resident_id: r.resident_id, other_id: r.other_id, score: r.score })));
}

/** Backfill for days simulated before Phase 4: today's scores stand in for missing days. */
export async function backfillRelationshipHistory(store: Store, today: number) {
  const existing = new Set((await store.listRelationshipHistory()).map((h) => h.sim_day));
  for (let d = 1; d < today; d++) if (!existing.has(d)) await recordRelationshipHistory(store, d);
}
