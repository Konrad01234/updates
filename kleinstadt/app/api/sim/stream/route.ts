import { snapshot } from "@/lib/sim/runtime";
export const dynamic = "force-dynamic";

/** Server-Sent Events: the full state every 500 ms (positions change every tick, so a diff is not worth it). */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      req.signal.addEventListener("abort", () => { open = false; controller.close(); });
      while (open) {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(await snapshot())}\n\n`)); } catch { break; }
        await new Promise((r) => setTimeout(r, 500));
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
