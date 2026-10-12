import { NextResponse } from "next/server";
import { rewindSim } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const { day } = (await req.json()) as { day: number };
  try { return NextResponse.json(await rewindSim(day)); }
  catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 409 }); }
}
