"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import * as THREE from "three";
import type { Location, Position, Resident, SimEvent, SimState, World } from "@/lib/types";
import type { MapData } from "./MapCanvas";
import { sunState } from "@/lib/sim/weather";

interface Props {
  map: MapData; residents: Resident[]; positions: Position[]; locations: Location[]; events: SimEvent[]; state: SimState; world: World | null;
  follow: string | null; onPickResident: (id: string) => void; onPickLocation: (id: string) => void;
}

const TILE = { road: "#d9d2bd", building: "#8a7f6a", green: "#a9bf8c" } as const;
const PALETTE = ["#b5533c", "#4f6b3a", "#2f5f8a", "#8a4f8a", "#c48a2a", "#2f7f7a", "#7a4f2f", "#4f4f8a"];
const heightFor = (t: Location["type"]) => (t === "home" ? 2 : t === "work" ? 4 : 3);

/**
 * Labels live in a plain DOM overlay next to the canvas, not in drei's <Html>: that component mounts a React root per
 * label and tears it down synchronously, which React 19 rejects and which throws once the canvas is gone (view switch,
 * speech bubble disappearing). Each scene object projects its own world position into its overlay element every frame.
 */
type LabelRegistry = RefObject<Map<string, HTMLDivElement>>;
const LABEL: CSSProperties = { position: "absolute", left: 0, top: 0, display: "none", whiteSpace: "nowrap", fontFamily: "Georgia", color: "#1f2a1f", textShadow: "0 0 3px #fff, 0 0 3px #fff", willChange: "transform" };

function useLabel(registry: LabelRegistry, key: string, obj: RefObject<THREE.Object3D | null>, offsetY: number) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const el = registry.current?.get(key); const o = obj.current;
    if (!el || !o) return;
    v.setFromMatrixPosition(o.matrixWorld); v.y += offsetY;
    const dist = v.distanceTo(camera.position);
    v.project(camera);
    const visible = v.z > -1 && v.z < 1;
    el.style.display = visible ? "" : "none";
    if (!visible) return;
    const scale = Math.max(0.75, Math.min(1.2, 40 / dist));
    el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -100%) scale(${scale})`;
  });
}

/** Ground: one InstancedMesh for all tiles. */
function Ground({ map }: { map: MapData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = map.width * map.height;
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      dummy.position.set(x, -0.05, y); dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, new THREE.Color(TILE[map.cells[y][x]])); i++;
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [map]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow={false}>
      <boxGeometry args={[1, 0.1, 1]} />
      <meshLambertMaterial />
    </instancedMesh>
  );
}

function Building({ l, footprint, lit, labels, onPick }: { l: Location; footprint: { x: number; y: number }[]; lit: boolean; labels: LabelRegistry; onPick: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const xs = footprint.map((p) => p.x), ys = footprint.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) + 1, d = Math.max(...ys) - Math.min(...ys) + 1, h = heightFor(l.type);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...ys) + Math.max(...ys)) / 2;
  useLabel(labels, l.id, ref, h / 2 + 0.4);
  return (
    <group ref={ref} position={[cx, h / 2, cz]} onClick={(e) => { e.stopPropagation(); onPick(l.id); }}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshLambertMaterial color={l.status === "closed" ? "#5c5650" : l.type === "home" ? "#c9b99a" : "#b48a62"} />
      </mesh>
      {lit && <mesh position={[0, 0, d / 2 + 0.01]}><planeGeometry args={[w * 0.6, h * 0.4]} /><meshBasicMaterial color="#ffd97a" /></mesh>}
    </group>
  );
}

function Figure({ r, pos, color, follow, labels, onPick }: { r: Resident; pos: Position; color: string; follow: boolean; labels: LabelRegistry; onPick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(pos.x, 0, pos.y), [pos.x, pos.y]);
  useFrame((_, dt) => { if (ref.current) ref.current.position.lerp(target, Math.min(1, dt * 4)); });
  useLabel(labels, r.id, ref, 1.5);
  useLabel(labels, `${r.id}:talk`, ref, 2.1);
  return (
    <group ref={ref} position={[pos.x, 0, pos.y]} onClick={(e) => { e.stopPropagation(); onPick(); }}>
      <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.22, 0.22, 0.9, 12]} /><meshLambertMaterial color={color} /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.24, 12, 12]} /><meshLambertMaterial color="#f1d7bd" /></mesh>
      {follow && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.4, 0.5, 24]} /><meshBasicMaterial color="#1f2a1f" /></mesh>}
    </group>
  );
}

function Rain({ map }: { map: MapData }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) { arr[i * 3] = Math.random() * map.width; arr[i * 3 + 1] = Math.random() * 15; arr[i * 3 + 2] = Math.random() * map.height; }
    return arr;
  }, [map]);
  useFrame((_, dt) => {
    const p = ref.current?.geometry.attributes.position as THREE.BufferAttribute | undefined; if (!p) return;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 12; if (y < 0) y = 15; p.setY(i, y); }
    p.needsUpdate = true;
  });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#8fa6c8" size={0.08} /></points>;
}

function Lights({ state, world, map }: { state: SimState; world: World | null; map: MapData }) {
  const sun = sunState(state.sim_hour, state.sim_minute);
  const angle = ((state.sim_hour + state.sim_minute / 60 - 6) / 14) * Math.PI;
  const dim = world?.weather === "Regen" ? 0.4 : world?.weather === "bewölkt" ? 0.7 : 1;
  return (
    <>
      <ambientLight intensity={0.35 + sun.elevation * 0.35 * dim} color={sun.phase === "night" ? "#6b7aa8" : sun.color} />
      <directionalLight position={[map.width / 2 + Math.cos(angle) * 40, 5 + sun.elevation * 40, map.height / 2]} intensity={sun.elevation * 1.2 * dim} color={sun.color} />
      <hemisphereLight args={[sun.phase === "night" ? "#1c2238" : "#cfe3ff", "#6b7a52", 0.3]} />
    </>
  );
}

export default function Scene3D({ map, residents, positions, locations, events, state, world, follow, onPickResident, onPickLocation }: Props) {
  const labels = useRef(new Map<string, HTMLDivElement>());
  const bind = (key: string) => (el: HTMLDivElement | null) => { if (el) labels.current.set(key, el); else labels.current.delete(key); };
  const sun = sunState(state.sim_hour, state.sim_minute);
  const night = sun.phase === "night";
  const talking = new Set(events.filter((e) => e.type === "talk" && e.sim_day === state.sim_day && e.sim_hour === state.sim_hour).flatMap((e) => e.resident_ids));
  const followPos = follow ? positions.find((p) => p.resident_id === follow) : null;
  const bg = night ? "#141a2e" : world?.weather === "Regen" ? "#8e98a8" : world?.weather === "bewölkt" ? "#b9c3cc" : "#cfe6f7";
  const buildings = locations.filter((l) => map.places[l.id]?.footprint.length);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2", background: bg, borderRadius: 4, overflow: "hidden" }}>
      <Canvas camera={{ position: [map.width / 2, 35, map.height + 20], fov: 45, near: 0.5, far: 300 }} dpr={[1, 1.5]}>
        <Lights state={state} world={world} map={map} />
        <Ground map={map} />
        {buildings.map((l) => (
          <Building key={l.id} l={l} footprint={map.places[l.id].footprint} lit={night && residents.some((r) => r.current_location_id === l.id)} labels={labels} onPick={onPickLocation} />
        ))}
        {residents.map((r, i) => {
          const pos = positions.find((p) => p.resident_id === r.id);
          return pos ? <Figure key={r.id} r={r} pos={pos} color={PALETTE[i % PALETTE.length]} follow={follow === r.id} labels={labels} onPick={() => onPickResident(r.id)} /> : null;
        })}
        {world?.weather === "Regen" && <Rain map={map} />}
        <OrbitControls target={followPos ? [followPos.x, 0, followPos.y] : [map.width / 2, 0, map.height / 2]} minDistance={10} maxDistance={80} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
      <div className="labels3d" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {buildings.map((l) => <div key={l.id} ref={bind(l.id)} style={{ ...LABEL, fontSize: 12 }}>{l.name}{l.status === "closed" ? " (geschlossen)" : ""}</div>)}
        {residents.map((r) => <div key={r.id} ref={bind(r.id)} style={{ ...LABEL, fontSize: 11 }}>{r.name}</div>)}
        {residents.filter((r) => talking.has(r.id)).map((r) => <div key={`${r.id}:talk`} ref={bind(`${r.id}:talk`)} style={{ ...LABEL, fontSize: 16, textShadow: "none" }}>💬</div>)}
      </div>
    </div>
  );
}
