"use client";
import { useState } from "react";

interface Proposal { operations: unknown[]; summary: string; preview: string[] }

export default function GodMode({ residents, locations, disabled, onDone }: { residents: { id: string; name: string }[]; locations: { id: string; name: string }[]; disabled: boolean; onDone: () => void }) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState("alle");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: unknown) {
    setBusy(true); setError(null);
    const res = await fetch("/api/sim/intervene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error); return null; }
    return json;
  }

  return (
    <div className="god">
      <h2>Gott-Modus</h2>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ein Sturm zerstört die Schule …" rows={2} />
      <div className="god-row">
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="alle">alle</option>
          {locations.map((l) => <option key={l.id} value={`am Ort ${l.id}`}>am Ort: {l.name}</option>)}
          {residents.map((r) => <option key={r.id} value={`nur ${r.id}`}>nur {r.name}</option>)}
        </select>
        <button disabled={disabled || busy || !text.trim()} onClick={async () => setProposal(await call({ text, scope }))}>{busy ? "Regisseur denkt …" : "Vorschau"}</button>
      </div>
      {disabled && <small>Zum Eingreifen erst pausieren.</small>}
      {error && <div className="status error">{error}</div>}
      {proposal && (
        <div className="god-preview">
          <p>{proposal.summary}</p>
          <ul>{proposal.preview.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <button disabled={busy} onClick={async () => { if (await call({ text, operations: proposal.operations, summary: proposal.summary, confirm: true })) { setProposal(null); setText(""); onDone(); } }}>Anwenden</button>{" "}
          <button onClick={() => setProposal(null)}>Verwerfen</button>
        </div>
      )}
    </div>
  );
}
