"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Location, Memory, Position, Relationship, Resident, SimEvent, SimState } from "@/lib/types";
import MapCanvas, { type MapData } from "./MapCanvas";

interface Snapshot {
  state: SimState; residents: Resident[]; locations: Location[]; events: SimEvent[]; relationships: Relationship[];
  memories: Record<string, Memory[]>; positions: Position[]; snapshots: number[]; running: boolean; speed: number;
  error: string | null; map: MapData;
}

const clock = (s: SimState) => `Tag ${s.sim_day}, ${String(s.sim_hour).padStart(2, "0")}:${String(s.sim_minute).padStart(2, "0")}`;

export default function Page() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [follow, setFollow] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);
  const es = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    es.current?.close();
    const source = new EventSource("/api/sim/stream");
    source.onmessage = (ev) => setSnap(JSON.parse(ev.data));
    source.onerror = () => { source.close(); setTimeout(connect, 2000); };
    es.current = source;
  }, []);
  useEffect(() => { connect(); return () => es.current?.close(); }, [connect]);

  async function post(path: string, body?: unknown) {
    setError(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
    if (!res.ok) setError((await res.json()).error ?? res.statusText);
  }

  if (!snap) return <div className="col">Lade Lindenbach …</div>;
  const locName = (id: string | null) => snap.locations.find((l) => l.id === id)?.name ?? "unterwegs";
  const sel = snap.residents.find((r) => r.id === selected);
  const err = error ?? snap.error;
  const busy = snap.running;

  return (
    <div className="app">
      <header>
        <h1>Lindenbach</h1>
        <span className="clock">{clock(snap.state)}</span>
        <span className={`status${err ? " error" : ""}`}>{err ?? (busy ? `läuft ${snap.speed}×` : "bereit")}</span>
        <button disabled={busy} onClick={() => post("/api/sim/step", { ticks: 1 })}>10 Min</button>
        <button onClick={() => post(busy ? "/api/sim/pause" : "/api/sim/run", { speed: 1 })}>{busy ? "Pause" : "1×"}</button>
        <button disabled={busy} onClick={() => post("/api/sim/run", { speed: 5 })}>5×</button>
        <button disabled={busy} onClick={() => post("/api/sim/run", { speed: 20 })}>20×</button>
        <button disabled={busy} onClick={() => confirm("Stadt auf Tag 1 zurücksetzen?") && post("/api/sim/reset")}>Zurücksetzen</button>
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
              <button onClick={() => setFollow(follow === sel.id ? null : sel.id)}>{follow === sel.id ? "Nicht mehr folgen" : "Folgen"}</button>{" "}
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
          <MapCanvas map={snap.map} residents={snap.residents} positions={snap.positions} locations={snap.locations} events={snap.events}
            follow={follow} onPickResident={setSelected} onPickTalk={setOpenEvent} />
          <div className="timeline">
            <span>Snapshots:</span>
            {snap.snapshots.map((d) => (
              <button key={d} disabled={busy} onClick={() => confirm(`Zu Tag ${d} zurückspulen? Alles danach geht verloren.`) && post("/api/sim/rewind", { day: d })}>Tag {d}</button>
            ))}
          </div>
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
