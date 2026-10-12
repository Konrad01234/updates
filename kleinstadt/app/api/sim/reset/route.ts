import { NextResponse } from "next/server";
import { resetSim } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";
export async function POST() { return NextResponse.json(await resetSim()); }
