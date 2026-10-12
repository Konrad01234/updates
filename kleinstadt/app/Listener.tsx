"use client";
import { useEffect, useRef, useState } from "react";

interface Line { a: string; b: string; location: string; speaker: string; text: string; done?: boolean }

/** Live eavesdropping: lines arrive as they are generated and are shown with a 1–2 s rhythm. */
export default function Listener({ names, filter, disabled, onClose }: { names: Map<string, string>; filter: [string, string] | null; disabled: boolean; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const queue = useRef<Line[]>([]);

  useEffect(() => {
    if (disabled) return;
    const es = new EventSource("/api/sim/listen");
    es.onmessage = (ev) => {
      const line = JSON.parse(ev.data) as Line;
      if (filter && filter[0] === filter[1] && !(line.a === filter[0] || line.b === filter[0])) return;
      if (filter && filter[0] !== filter[1] && !(line.a === filter[0] && line.b === filter[1]) && !(line.a === filter[1] && line.b === filter[0])) return;
      queue.current.push(line);
    };
    const t = setInterval(() => { const next = queue.current.shift(); if (next) setLines((l) => [...l.slice(-40), next]); }, 1500);
    return () => { es.close(); clearInterval(t); };
  }, [filter, disabled]);

  return (
    <div className="listener">
      <h2>Belauschen {filter ? (filter[0] === filter[1] ? `· ${names.get(filter[0])}` : `· ${names.get(filter[0])} und ${names.get(filter[1])}`) : "· alle Gespräche"} <button onClick={onClose}>Schließen</button></h2>
      {disabled ? <small>Bei 20× ist Belauschen deaktiviert.</small> : lines.length === 0 ? <small>Warte auf das nächste Gespräch …</small> : null}
      {lines.map((l, i) => l.done
        ? <div key={i} className="listener-end">Gespräch beendet.</div>
        : <div key={i} className="listener-line"><small>{l.location}</small><b>{names.get(l.speaker) ?? l.speaker}:</b> {l.text}</div>)}
    </div>
  );
}
