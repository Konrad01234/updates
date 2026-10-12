import { NextResponse } from "next/server";
import { runSim, type Speed } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const { speed = 1 } = (await req.json().catch(() => ({}))) as { speed?: Speed };
  await runSim(([1, 5, 20] as Speed[]).includes(speed) ? speed : 1);
  return NextResponse.json({ ok: true });
}
