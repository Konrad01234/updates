"use client";
import { useState } from "react";
import type { Newspaper as Paper, SimEvent } from "@/lib/types";

export default function Newspaper({ papers, onJump, onClose }: { papers: Paper[]; onJump: (eventId: number) => void; onClose: () => void }) {
  const [day, setDay] = useState(papers.at(-1)?.sim_day ?? 0);
  const paper = papers.find((p) => p.sim_day === day);
  if (!paper) return null;
  return (
    <div className="paper">
      <div className="masthead">
        <span className="title">Lindenbacher Bote</span>
        <span>Ausgabe Tag {paper.sim_day}</span>
        <span>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>{papers.map((p) => <option key={p.sim_day} value={p.sim_day}>Tag {p.sim_day}</option>)}</select>{" "}
          <button onClick={onClose}>Schließen</button>
        </span>
      </div>
      {paper.articles.map((a, i) => (
        <details key={i} className="article" open={i === 0}>
          <summary><small>{a.section}</small><b onClick={() => onJump(a.event_ids[0])}>{a.headline}</b><em>{a.teaser}</em></summary>
          <p>{a.body}</p>
        </details>
      ))}
    </div>
  );
}
export type { SimEvent };
