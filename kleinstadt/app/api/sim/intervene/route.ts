import { NextResponse } from "next/server";
import { proposeIntervention, applyIntervention } from "@/lib/sim/director";
import { getStore } from "@/lib/db";
import { getEngine, isRunning } from "@/lib/sim/runtime";
import type { Operation } from "@/lib/ai/schemas";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST { text, scope } → proposal; POST { text, operations, summary, confirm: true } → applied. */
export async function POST(req: Request) {
  const body = (await req.json()) as { text: string; scope?: string; operations?: Operation[]; summary?: string; confirm?: boolean };
  if (isRunning()) return NextResponse.json({ error: "Erst pausieren" }, { status: 409 });
  try {
    const store = await getStore();
    const engine = await getEngine();
    const state = await store.getState();
    if (body.confirm && body.operations) {
      await applyIntervention(store, await engine.getMap(), body.text, body.operations, body.summary ?? "", state.sim_day, state.sim_hour);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(await proposeIntervention(store, body.text, body.scope ?? "alle", state.sim_day, engine.aiBudget));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
