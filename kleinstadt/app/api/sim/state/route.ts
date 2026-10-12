import { NextResponse } from "next/server";
import { snapshot } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await snapshot()); }
