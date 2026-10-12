"use client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface Edge { resident_id: string; other_id: string; score: number; label?: string }
interface Data { day: number; maxDay: number; residents: { id: string; name: string }[]; edges: Edge[] }
type Filter = "alle" | "familie" | "konflikte" | "freundschaften";
type GraphNode = d3.SimulationNodeDatum & { id: string; name: string };
type GraphLink = d3.SimulationLinkDatum<GraphNode> & { e: Edge };
const PALETTE = ["#b5533c", "#4f6b3a", "#2f5f8a", "#8a4f8a", "#c48a2a", "#2f7f7a", "#7a4f2f", "#4f4f8a"];

export default function RelationshipGraph({ currentDay, reasons }: { currentDay: number; reasons: (a: string, b: string) => string[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [day, setDay] = useState(currentDay);
  const [filter, setFilter] = useState<Filter>("alle");
  const [data, setData] = useState<Data | null>(null);
  const [hover, setHover] = useState<Edge | null>(null);

  useEffect(() => { fetch(`/api/sim/graph?day=${day}`).then((r) => r.json()).then(setData); }, [day, currentDay]);

  useEffect(() => {
    if (!data || !ref.current) return;
    const w = ref.current.clientWidth || 600, h = 420;
    const edges = data.edges.filter((e) => e.score !== 0).filter((e) =>
      filter === "familie" ? /Mutter|Vater|Tochter|Sohn|Ehepaar|Enkel|Großmutter/.test(e.label ?? "") :
      filter === "konflikte" ? e.score < -30 : filter === "freundschaften" ? e.score > 50 : true);
    const nodes: GraphNode[] = data.residents.map((r) => ({ ...r }));
    const links: GraphLink[] = edges.map((e) => ({ source: e.resident_id, target: e.other_id, e }));
    const svg = d3.select(ref.current).attr("viewBox", `0 0 ${w} ${h}`);
    svg.selectAll("*").remove();
    const sim = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(90))
      .force("charge", d3.forceManyBody().strength(-260)).force("center", d3.forceCenter(w / 2, h / 2));
    const link = svg.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", (d) => d.e.score > 0 ? "#4f6b3a" : "#b5533c").attr("stroke-opacity", 0.7)
      .attr("stroke-width", (d) => 1 + Math.abs(d.e.score) / 20)
      .on("mouseenter", (_, d) => setHover(d.e)).on("mouseleave", () => setHover(null));
    const node = svg.append("g").selectAll("g").data(nodes).join("g");
    node.append("circle").attr("r", 14).attr("fill", (_, i) => PALETTE[i % PALETTE.length]);
    node.append("text").text((d) => d.name.split(" ")[0]).attr("y", 26).attr("text-anchor", "middle").attr("font-size", 11).attr("font-family", "Georgia").attr("fill", "#1f2a1f");
    sim.on("tick", () => {
      link.attr("x1", (d) => (d.source as GraphNode).x ?? 0).attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0).attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
    return () => { sim.stop(); };
  }, [data, filter]);

  const name = (id: string) => data?.residents.find((r) => r.id === id)?.name ?? id;
  return (
    <div className="graph">
      <div className="graph-controls">
        <label>Tag <input type="range" min={1} max={data?.maxDay ?? currentDay} value={day} onChange={(e) => setDay(Number(e.target.value))} /> {day}</label>
        {(["alle", "familie", "konflikte", "freundschaften"] as Filter[]).map((f) => <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <svg ref={ref} style={{ width: "100%", height: 420 }} />
      {hover && <div className="graph-tip"><b>{name(hover.resident_id)} → {name(hover.other_id)}: {hover.score}</b>{hover.label && <div>{hover.label}</div>}{reasons(hover.resident_id, hover.other_id).map((r, i) => <div key={i}>· {r}</div>)}</div>}
    </div>
  );
}
