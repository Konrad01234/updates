import { onConversationTurn } from "@/lib/sim/conversation";
export const dynamic = "force-dynamic";

/** SSE: every spoken line of every conversation as it is generated. */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const off = onConversationTurn((t) => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(t)}\n\n`)); } catch { off(); } });
      req.signal.addEventListener("abort", () => { off(); try { controller.close(); } catch { /* closed */ } });
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
