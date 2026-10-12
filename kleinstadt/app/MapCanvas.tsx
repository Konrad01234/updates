"use client";
import { useEffect, useRef } from "react";
import type { Location, Position, Resident, SimEvent, SimState } from "@/lib/types";
import type { Cell, Point } from "@/lib/sim/map";

export interface MapData { width: number; height: number; cells: Cell[][]; places: Record<string, { entrance: Point; footprint: Point[] }> }

interface Props {
  map: MapData; residents: Resident[]; positions: Position[]; locations: Location[]; events: SimEvent[]; state: SimState;
  follow: string | null; onPickResident: (id: string) => void; onPickTalk: (id: number) => void;
}

const COLORS = { road: "#d9d2bd", building: "#8a7f6a", green: "#a9bf8c" };
const PALETTE = ["#b5533c", "#4f6b3a", "#2f5f8a", "#8a4f8a", "#c48a2a", "#2f7f7a", "#7a4f2f", "#4f4f8a"];

/** 2D map on a plain canvas; Phase 3 swaps this component for the Three.js scene. */
export default function MapCanvas({ map, residents, positions, locations, events, state, follow, onPickResident, onPickTalk }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const prev = useRef<Map<string, Point>>(new Map());
  const frameStart = useRef(performance.now());
  const cell = 14;

  useEffect(() => { frameStart.current = performance.now(); }, [positions]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const draw = () => {
      const t = Math.min(1, (performance.now() - frameStart.current) / 400);
      const w = map.width * cell, h = map.height * cell;
      canvas.width = w; canvas.height = h;
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        ctx.fillStyle = COLORS[map.cells[y][x]]; ctx.fillRect(x * cell, y * cell, cell, cell);
      }
      ctx.font = "11px Georgia"; ctx.fillStyle = "#1f2a1f"; ctx.textAlign = "center";
      for (const [id, place] of Object.entries(map.places)) {
        const loc = locations.find((l) => l.id === id); if (!loc) continue;
        const fp = place.footprint;
        const cx = fp.length ? (fp.reduce((s, p) => s + p.x, 0) / fp.length + 0.5) * cell : place.entrance.x * cell;
        const cy = fp.length ? (fp.reduce((s, p) => s + p.y, 0) / fp.length + 0.5) * cell : place.entrance.y * cell - 8;
        ctx.fillStyle = loc.type === "home" ? "#f6f3ea" : "#1f2a1f";
        ctx.fillText(loc.name, cx, cy + 4);
        ctx.fillStyle = "#1f2a1f"; ctx.fillRect(place.entrance.x * cell + 4, place.entrance.y * cell + 4, cell - 8, cell - 8);
      }
      const talksNow = events.filter((e) => e.type === "talk" && isCurrent(e, state)).slice(0, 8);
      residents.forEach((r, i) => {
        const pos = positions.find((p) => p.resident_id === r.id); if (!pos) return;
        const from = prev.current.get(r.id) ?? pos;
        const x = (from.x + (pos.x - from.x) * t + 0.5) * cell, y = (from.y + (pos.y - from.y) * t + 0.5) * cell;
        ctx.beginPath(); ctx.arc(x, y, cell * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = PALETTE[i % PALETTE.length]; ctx.fill();
        if (follow === r.id) { ctx.lineWidth = 2; ctx.strokeStyle = "#1f2a1f"; ctx.stroke(); }
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px Georgia"; ctx.fillText(r.name[0], x, y + 3);
        if (talksNow.some((e) => e.resident_ids.includes(r.id))) {
          ctx.fillStyle = "#1f2a1f"; ctx.font = "12px Georgia"; ctx.fillText("💬", x, y - cell * 0.7);
        }
      });
      if (t >= 1) prev.current = new Map(positions.map((p) => [p.resident_id, { x: p.x, y: p.y }]));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [map, residents, positions, locations, events, state, follow]);

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * map.width, y = ((e.clientY - rect.top) / rect.height) * map.height;
    const hit = positions.find((p) => Math.hypot(p.x + 0.5 - x, p.y + 0.5 - y) < 0.8);
    if (!hit) return;
    const talk = events.find((ev) => ev.type === "talk" && ev.resident_ids.includes(hit.resident_id) && isCurrent(ev, state));
    if (talk) onPickTalk(talk.id); else onPickResident(hit.resident_id);
  }

  return <canvas ref={ref} onClick={onClick} style={{ width: "100%", height: "auto", display: "block", cursor: "pointer" }} />;
}

/** A talk counts as "now" during the simulated hour it happened in; the protocol no longer carries move events, so the clock, not events[0], defines "now". */
const isCurrent = (e: SimEvent, state: SimState) => e.sim_day === state.sim_day && e.sim_hour === state.sim_hour;
