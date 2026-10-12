"use client";
import { useCallback, useEffect, useState } from "react";
import type { Location, Memory, Relationship, Resident, SimEvent, SimState } from "@/lib/types";

interface Snapshot {
  state: SimState; residents: Resident[]; locations: Location[]; events: SimEvent[];
  relationships: Relationship[]; memories: Record<string, Memory[]>; running: boolean;
}

export default function Page() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sim/state", { cache: "no-store" });
    setSnap(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [busy, load]);

  async function run(path: string, body?: unknown) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      if (!res.ok) setError((await res.json()).error ?? res.statusText);
    } finally {
      setBusy(false); await load();
    }
  }

  if (!snap) return <div className="col">Lade Lindenbach …</div>;
  const locName = (id: string | null) => snap.locations.find((l) => l.id === id)?.name ?? "–";
  const sel = snap.residents.find((r) => r.id === selected);

  return (
    <div className="app">
      <header>
        <h1>Lindenbach</h1>
        <span className="clock">Tag {snap.state.sim_day}, {String(snap.state.sim_hour).padStart(2, "0")}:00</span>
        <span className={`status${error ? " error" : ""}`}>{error ?? (busy ? "läuft …" : "bereit")}</span>
        <button disabled={busy} onClick={() => run("/api/sim/step", { ticks: 1 })}>1 Stunde</button>
        <button disabled={busy} onClick={() => run("/api/sim/step", { ticks: 6 })}>6 Stunden</button>
        <button disabled={busy} onClick={() => run("/api/sim/step", { ticks: 18 })}>Ganzer Tag</button>
        <button disabled={busy} onClick={() => confirm("Stadt auf Tag 1 zurücksetzen?") && run("/api/sim/reset")}>Zurücksetzen</button>
      </header>
      <main>
        <section className="col">
          {sel && (
            <div className="detail">
              <h2>{sel.name}</h2>
              <dl>
                <dt>Beruf</dt><dd>{sel.job}</dd>
                <dt>Persönlichkeit</dt><dd>{sel.personality}</dd>
                <dt>Ziele</dt><dd>{sel.goals.join(" · ")}</dd>
                <dt>Beziehungen</dt>
                <dd>{snap.relationships.filter((r) => r.resident_id === sel.id).map((r) => (
                  <div key={r.other_id}>{snap.residents.find((x) => x.id === r.other_id)?.name}: {r.score > 0 ? "+" : ""}{r.score} {r.label && <small>({r.label})</small>}</div>
                ))}</dd>
                <dt>Neueste Erinnerungen</dt>
                <dd>{(snap.memories[sel.id] ?? []).map((m) => <div key={m.id}>· {m.content}</div>)}</dd>
              </dl>
              <button onClick={() => setSelected(null)}>Schließen</button>
            </div>
          )}
          <h2>Bewohner</h2>
          {snap.residents.map((r) => (
            <div key={r.id} className={`resident${r.id === selected ? " active" : ""}`} onClick={() => setSelected(r.id)}>
              {r.name}<small>{locName(r.current_location_id)} · {r.current_action || "–"}</small>
            </div>
          ))}
        </section>
        <section className="col">
          <h2>Protokoll</h2>
          {snap.events.filter((e) => e.type !== "move").map((e) => (
            <div key={e.id} className={`event ${e.type}`} onClick={() => e.transcript && setOpenEvent(openEvent === e.id ? null : e.id)}>
              <time>Tag {e.sim_day}, {String(e.sim_hour).padStart(2, "0")}:00</time>{e.summary}
              {openEvent === e.id && e.transcript && (
                <div className="transcript">{e.transcript.map((t, i) => (
                  <div key={i}><b>{snap.residents.find((r) => r.id === t.speaker)?.name ?? t.speaker}:</b> {t.text}</div>
                ))}</div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
