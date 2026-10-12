import { NextResponse } from "next/server";
import { stepSim } from "@/lib/sim/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { ticks = 1 } = (await req.json().catch(() => ({}))) as { ticks?: number };
  try {
    return NextResponse.json(await stepSim(Math.min(24, Math.max(1, ticks))));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}
