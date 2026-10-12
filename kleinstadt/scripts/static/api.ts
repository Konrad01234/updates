/**
 * In-browser stand-in for the /api/sim routes. The static build (npm run build:static) runs the whole mock simulation
 * inside the page, so the UI's fetch() and EventSource() calls are answered here instead of by a Next server.
 * The handlers mirror app/api/sim/* one to one; keep them in sync when a route changes.
 */
import { getStore } from "@/lib/db";
import { getEngine, isRunning, pauseSim, resetSim, rewindSim, runSim, snapshot, stepSim, type Speed } from "@/lib/sim/runtime";
import { backfillRelationshipHistory } from "@/lib/sim/history";
import { applyIntervention, proposeIntervention } from "@/lib/sim/director";
import { onConversationTurn } from "@/lib/sim/conversation";
import type { Operation } from "@/lib/ai/schemas";

type Body = Record<string, unknown>;

async function handle(path: string, params: URLSearchParams, body: Body): Promise<{ status: number; data: unknown }> {
  const ok = (data: unknown) => ({ status: 200, data });
  const fail = (status: number, error: string) => ({ status, data: { error } });
  switch (path) {
    case "/api/sim/state": return ok(await snapshot());
    case "/api/sim/step": {
      const ticks = Number(body.ticks ?? 1);
      try { return ok(await stepSim(Math.min(24 * 6, Math.max(1, ticks)))); } catch (err) { return fail(409, (err as Error).message); }
    }
    case "/api/sim/run": {
      const speed = Number(body.speed ?? 1) as Speed;
      await runSim(([1, 5, 20] as Speed[]).includes(speed) ? speed : 1);
      return ok({ ok: true });
    }
    case "/api/sim/pause": pauseSim(); return ok({ ok: true });
    case "/api/sim/reset": return ok(await resetSim());
    case "/api/sim/rewind": {
      try { return ok(await rewindSim(Number(body.day))); } catch (err) { return fail(409, (err as Error).message); }
    }
    case "/api/sim/graph": {
      const store = await getStore();
      const state = await store.getState();
      const day = Number(params.get("day") ?? state.sim_day);
      await backfillRelationshipHistory(store, state.sim_day);
      const edges = day >= state.sim_day
        ? (await store.listRelationships()).map((r) => ({ resident_id: r.resident_id, other_id: r.other_id, score: r.score, label: r.label }))
        : await store.listRelationshipHistory(day);
      const residents = (await store.listResidents()).map((r) => ({ id: r.id, name: r.name }));
      return ok({ day, maxDay: state.sim_day, residents, edges });
    }
    case "/api/sim/intervene": {
      if (isRunning()) return fail(409, "Erst pausieren");
      try {
        const store = await getStore();
        const engine = await getEngine();
        const state = await store.getState();
        const text = String(body.text ?? "");
        if (body.confirm && Array.isArray(body.operations)) {
          await applyIntervention(store, await engine.getMap(), text, body.operations as Operation[], String(body.summary ?? ""), state.sim_day, state.sim_hour);
          return ok({ ok: true });
        }
        return ok(await proposeIntervention(store, text, String(body.scope ?? "alle"), state.sim_day, engine.aiBudget));
      } catch (err) { return fail(400, (err as Error).message); }
    }
    default: return fail(404, `Unbekannte Route ${path}`);
  }
}

/** Replaces EventSource for /api/sim/stream (state every 500 ms) and /api/sim/listen (conversation lines). */
class LocalEventSource extends EventTarget {
  onmessage: ((ev: MessageEvent<string>) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  readonly url: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private off: (() => void) | null = null;

  constructor(url: string) {
    super();
    this.url = url;
    const emit = (data: unknown) => this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
    if (url.startsWith("/api/sim/stream")) {
      const tick = async () => { try { emit(await snapshot()); } catch (err) { console.error(err); } };
      setTimeout(tick, 0);
      this.timer = setInterval(tick, 500);
    } else if (url.startsWith("/api/sim/listen")) {
      this.off = onConversationTurn(emit);
    }
  }
  close() { if (this.timer) clearInterval(this.timer); this.off?.(); }
}

export function installBrowserApi() {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith("/api/sim/")) return realFetch(input, init);
    const u = new URL(url, location.href);
    const body: Body = init?.body ? (JSON.parse(String(init.body)) as Body) : {};
    const { status, data } = await handle(u.pathname, u.searchParams, body);
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  (window as unknown as { EventSource: typeof LocalEventSource }).EventSource = LocalEventSource;
  // The artifact viewer answers confirm() with false without showing a dialog; the reset and rewind buttons rely on it.
  window.confirm = () => true;
}
