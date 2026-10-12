"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
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

/** Ground: one InstancedMesh for all tiles. */
function Ground({ map }: { map: MapData }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = map.width * map.height;
  useMemo(() => {
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

function Buildings({ map, locations, residents, night, onPick }: { map: MapData; locations: Location[]; residents: Resident[]; night: boolean; onPick: (id: string) => void }) {
  return (
    <>
      {locations.filter((l) => map.places[l.id]?.footprint.length).map((l) => {
        const fp = map.places[l.id].footprint;
        const xs = fp.map((p) => p.x), ys = fp.map((p) => p.y);
        const w = Math.max(...xs) - Math.min(...xs) + 1, d = Math.max(...ys) - Math.min(...ys) + 1, h = heightFor(l.type);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...ys) + Math.max(...ys)) / 2;
        const lit = night && residents.some((r) => r.current_location_id === l.id);
        return (
          <group key={l.id} position={[cx, h / 2, cz]} onClick={(e) => { e.stopPropagation(); onPick(l.id); }}>
            <mesh>
              <boxGeometry args={[w, h, d]} />
              <meshLambertMaterial color={l.status === "closed" ? "#5c5650" : l.type === "home" ? "#c9b99a" : "#b48a62"} />
            </mesh>
            {lit && <mesh position={[0, 0, d / 2 + 0.01]}><planeGeometry args={[w * 0.6, h * 0.4]} /><meshBasicMaterial color="#ffd97a" /></mesh>}
            <Html position={[0, h / 2 + 0.4, 0]} center distanceFactor={30} style={{ pointerEvents: "none", fontSize: 12, fontFamily: "Georgia", color: "#1f2a1f", whiteSpace: "nowrap" }}>
              {l.name}{l.status === "closed" ? " (geschlossen)" : ""}
            </Html>
          </group>
        );
      })}
    </>
  );
}

function Figure({ r, pos, color, talking, follow, onPick }: { r: Resident; pos: Position; color: string; talking: boolean; follow: boolean; onPick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(pos.x, 0, pos.y), [pos.x, pos.y]);
  useFrame((_, dt) => { if (ref.current) ref.current.position.lerp(target, Math.min(1, dt * 4)); });
  return (
    <group ref={ref} position={[pos.x, 0, pos.y]} onClick={(e) => { e.stopPropagation(); onPick(); }}>
      <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.22, 0.22, 0.9, 12]} /><meshLambertMaterial color={color} /></mesh>
      <mesh position={[0, 1.1, 0]}><sphereGeometry args={[0.24, 12, 12]} /><meshLambertMaterial color="#f1d7bd" /></mesh>
      {follow && <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.4, 0.5, 24]} /><meshBasicMaterial color="#1f2a1f" /></mesh>}
      {talking && <Html position={[0, 1.7, 0]} center style={{ pointerEvents: "none", fontSize: 16 }}>💬</Html>}
      <Html position={[0, 1.5, 0]} center distanceFactor={18} style={{ pointerEvents: "none", fontSize: 11, fontFamily: "Georgia", color: "#1f2a1f", whiteSpace: "nowrap" }}>{r.name}</Html>
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
      <ambientLight intensity={0.25 + sun.elevation * 0.35 * dim} color={sun.color} />
      <directionalLight position={[map.width / 2 + Math.cos(angle) * 40, 5 + sun.elevation * 40, map.height / 2]} intensity={sun.elevation * 1.2 * dim} color={sun.color} />
      <hemisphereLight args={[sun.phase === "night" ? "#1c2238" : "#cfe3ff", "#6b7a52", 0.3]} />
    </>
  );
}

export default function Scene3D({ map, residents, positions, locations, events, state, world, follow, onPickResident, onPickLocation }: Props) {
  const sun = sunState(state.sim_hour, state.sim_minute);
  const latest = events[0];
  const talking = new Set(events.filter((e) => e.type === "talk" && latest && e.sim_day === latest.sim_day && e.sim_hour === latest.sim_hour).flatMap((e) => e.resident_ids));
  const followPos = follow ? positions.find((p) => p.resident_id === follow) : null;
  const bg = sun.phase === "night" ? "#141a2e" : world?.weather === "Regen" ? "#8e98a8" : world?.weather === "bewölkt" ? "#b9c3cc" : "#cfe6f7";
  return (
    <div style={{ width: "100%", aspectRatio: "3 / 2", background: bg, borderRadius: 4 }}>
      <Canvas camera={{ position: [map.width / 2, 35, map.height + 20], fov: 45, near: 0.5, far: 300 }} dpr={[1, 1.5]}>
        <Lights state={state} world={world} map={map} />
        <Ground map={map} />
        <Buildings map={map} locations={locations} residents={residents} night={sun.phase === "night"} onPick={onPickLocation} />
        {residents.map((r, i) => {
          const pos = positions.find((p) => p.resident_id === r.id);
          return pos ? <Figure key={r.id} r={r} pos={pos} color={PALETTE[i % PALETTE.length]} talking={talking.has(r.id)} follow={follow === r.id} onPick={() => onPickResident(r.id)} /> : null;
        })}
        {world?.weather === "Regen" && <Rain map={map} />}
        <OrbitControls target={followPos ? [followPos.x, 0, followPos.y] : [map.width / 2, 0, map.height / 2]} minDistance={10} maxDistance={80} maxPolarAngle={Math.PI / 2.2} />
      </Canvas>
    </div>
  );
}
