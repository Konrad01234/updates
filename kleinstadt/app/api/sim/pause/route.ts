import { NextResponse } from "next/server";
import { pauseSim } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";
export async function POST() { pauseSim(); return NextResponse.json({ ok: true }); }
