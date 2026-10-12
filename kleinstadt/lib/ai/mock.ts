import { setMockProvider, type AiRequest } from "./client";

/** Deterministic fake answers for MOCK_AI=true. Parses ids out of the prompt so the schemas pass. */
export function registerDefaultMocks() {
  setMockProvider((tag: string, req: AiRequest) => {
    if (tag === "plan") {
      const home = /Wohnung: (\S+)\./.exec(req.user)?.[1] ?? "markt";
      return { plan: Array.from({ length: 18 }, (_, i) => ({ hour: 6 + i, location_id: i % 3 === 0 ? "markt" : home, activity: "Mock-Tag" })) };
    }
    if (tag === "conversation") {
      const ids = [...req.user.matchAll(/"resident_id": "(\w+)"/g)].map((m) => m[1]);
      const [a, b] = ids;
      return {
        turns: [
          { speaker: a, text: "Na, auch hier?" },
          { speaker: b, text: "Wie jeden Tag." },
          { speaker: a, text: "Hast du schon gehört, was am Markt los ist?" },
          { speaker: b, text: "Nein, erzähl." },
        ],
        memories: [
          { resident_id: a, content: `Kurzes Gespräch mit ${b} (Mock).`, importance: 2 },
          { resident_id: b, content: `Kurzes Gespräch mit ${a} (Mock).`, importance: 2 },
        ],
        relationship_deltas: [
          { from: a, to: b, delta: 2, reason: "nettes Gespräch" },
          { from: b, to: a, delta: 2, reason: "nettes Gespräch" },
        ],
      };
    }
    if (tag === "reflection") {
      const id = Number(/\[(\d+)\]/.exec(req.user)?.[1] ?? 1);
      return { insights: [{ content: "Ich sollte mehr auf die Leute um mich herum achten (Mock).", importance: 6, evidence_memory_ids: [id] }] };
    }
    throw new Error(`no mock for ${tag}`);
  });
}
