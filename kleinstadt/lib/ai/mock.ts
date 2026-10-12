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
    if (tag === "founding") {
      return { found: true, name: "Blumen Lange", type: "shop", description: "Kleiner Blumenladen mit Sträußen vom Feld (Mock)", price: 8 };
    }
    if (tag === "newspaper") {
      const ids = [...req.user.matchAll(/^- \[(\d+)\]/gm)].map((m) => Number(m[1]));
      const people = [...new Set([...req.user.matchAll(/\((\w+)\)/g)].map((m) => m[1]))].filter((p) => !/^\d/.test(p)).slice(0, 3);
      return { articles: [
        { headline: "Reges Treiben am Marktplatz (Mock)", teaser: "Lindenbach spricht über den Tag.", body: "Am Marktplatz kamen gestern viele Bewohner zusammen. Es wurde geredet, gelacht und gestritten, wie es sich für Lindenbach gehört. Die Redaktion hat zugehört und fasst zusammen, was die Stadt bewegt hat, von der Bäckerei bis zum Park. Mehr dazu in den kommenden Ausgaben.", section: "Lokales", event_ids: ids.slice(0, 2), mentioned_resident_ids: people },
        { headline: "Wetterbericht (Mock)", teaser: "So wird der Tag.", body: "Das Wetter bestimmte gestern den Tagesablauf vieler Bewohner. Wer in den Park wollte, musste sich nach dem Himmel richten, und auch die Läden spürten, ob die Sonne schien oder nicht. Die Redaktion rechnet mit weiteren Wetterwechseln in dieser Woche und rät, den Schirm nicht zu weit weg zu stellen.", section: "Wetter", event_ids: ids.slice(-1), mentioned_resident_ids: [] },
      ] };
    }
    if (tag === "director") {
      const closes = /Rathaus|Schule|schule/.test(req.user) && /zerst|Sturm/.test(req.user);
      return {
        operations: closes
          ? [
              { op: "close_location", location_id: "schule", reason: "Ein Sturm hat das Dach abgedeckt (Mock)" },
              { op: "add_memory", resident_id: "nadia", content: "Ein Sturm hat die Schule zerstört. Wo sollen die Kinder jetzt hin?", importance: 9 },
              { op: "add_memory", resident_id: "karl", content: "Der Sturm hat die Schule getroffen. So etwas hat Lindenbach noch nicht erlebt.", importance: 8 },
              { op: "set_relationship", from_id: "nadia", to_id: "karl", delta: -30, reason: "Karl hat die Dachsanierung jahrelang blockiert" },
            ]
          : [
              { op: "add_resident", resident: { id: "viktor", name: "Viktor Hahn", age: 45, job: "Fremder ohne erkennbaren Beruf", home_id: "home_lange", work_id: null, personality: "höflich, verschlossen, beobachtend", goals: ["Herausfinden, was in Lindenbach vor sich geht"], balance: 900, daily_wage: 40, employer_id: null, relationships: [], memories: [{ content: "Ich bin heute in Lindenbach angekommen. Niemand kennt mich hier.", importance: 7 }] } },
              { op: "add_memory", resident_id: "karl", content: "Ein Fremder ist in die Stadt gekommen. Ich muss herausfinden, wer das ist.", importance: 7 },
            ],
        summary: closes ? "Die Schule wird geschlossen, Lehrer und Kinder stehen auf der Straße (Mock)." : "Ein Fremder zieht nach Lindenbach (Mock).",
      };
    }
    throw new Error(`no mock for ${tag}`);
  });
}
