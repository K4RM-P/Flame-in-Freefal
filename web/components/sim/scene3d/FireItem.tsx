"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Sample holder + material sample (to scale: length × width), char (burnt length), burning zone, flame and fire light.
// Everything here is read from the VisualState (engine frame); nothing is computed from physics.
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { sig } from "@/lib/ui/format";
import { materialByKey } from "../data";
import { Flame, flameDims } from "./Flame";
import { getMats } from "./materials";
import { ANCHORS, MOD } from "./Module";
import { useVis } from "./vis";

const o2hi = (x: number) => Math.max(0, Math.min(1, (x - 0.21) / 0.13));

export function FireItems() {
  const { sc } = useVis();
  return <>{sc.items.map((it, i) => <FireItem key={it.id} i={i} />)}</>;
}

function FireItem({ i }: { i: number }) {
  const { sc, r, vs, layout, reduced, layers } = useVis();
  const it = sc.items[i];
  const mats = getMats();
  const x0 = layout.itemX[i], { y, z } = ANCHORS.sample;
  const L = it.length_m, W = it.width_m, th = Math.max(0.002, it.thickness_m);
  const charRef = useRef<THREE.Mesh>(null), zoneRef = useRef<THREE.Group>(null), flameG = useRef<THREE.Group>(null), light = useRef<THREE.PointLight>(null), ring = useRef<THREE.Group>(null);
  const lastBurn = useRef(0);
  const [hover, setHover] = useState(false);
  const local = useMemo(() => ({
    sample: new THREE.MeshStandardMaterial({ color: "#d8cdb2", roughness: 0.85 }),
    char: new THREE.MeshStandardMaterial({ color: "#0c0b0a", roughness: 1, emissive: new THREE.Color("#ff4a10"), emissiveIntensity: 0 }),
    zone: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.42, 0.08), toneMapped: false, transparent: true, opacity: 0.9 }),
    charGeo: (() => { const g = new THREE.BoxGeometry(1, 1, 1, 24, 6, 1); const p = g.attributes.position as THREE.BufferAttribute; for (let k = 0; k < p.count; k++) { const zz = p.getZ(k); if (Math.abs(zz) > 0.49) p.setZ(k, zz * (1 + 0.6 * Math.abs(Math.sin(p.getX(k) * 91 + p.getY(k) * 37)))); } g.computeVertexNormals(); return g; })(),
  }), []);
  const ringPts = useMemo(() => Array.from({ length: 49 }, (_, k) => { const a = (k / 48) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0); }), []);

  useFrame(({ clock }) => {
    const v = vs.current.items[i]; if (!v) return;
    const S = vs.current;
    if (charRef.current) {
      const c = Math.max(0, v.status === "out" ? v.front_m : v.charLen_m);
      charRef.current.visible = c > 1e-4; charRef.current.scale.set(c, W * 0.999, th + 0.0016); charRef.current.position.set(x0 + c / 2, y, z);
      local.char.emissiveIntensity = v.smoulder * (1.2 + (reduced ? 0 : 0.25 * Math.sin(clock.elapsedTime * 3)));
    }
    if (v.burnLen_m > 0) lastBurn.current = v.burnLen_m;
    const show = v.flamePresent || v.collapse > 0;
    const bl = v.flamePresent ? v.burnLen_m : lastBurn.current;
    const scale = v.flamePresent ? 1 : v.collapse;
    const cx = x0 + Math.max(bl / 2, (v.flamePresent ? v.front_m : v.front_m) - bl / 2);
    if (zoneRef.current) { zoneRef.current.visible = show && layers.heat; zoneRef.current.scale.set(Math.max(0.002, bl), W * 0.98, th + 0.003); zoneRef.current.position.set(cx, y, z); local.zone.opacity = (0.4 + 0.6 * S.qRatio) * scale; }
    if (flameG.current) { flameG.current.position.set(cx, y, z); flameG.current.visible = show && layers.heat; }
    if (light.current) {
      const { T, H } = flameDims(bl, W, S.qRatio, S.shape);
      light.current.position.set(cx, y + H * 0.5, z + T * 3 + 0.08);
      light.current.intensity = show ? (0.5 + 3.2 * S.qRatio) * scale * (0.5 + 0.5 * Math.min(1.2, S.o2Ratio)) * (reduced ? 1 : 0.92 + 0.08 * Math.sin(clock.elapsedTime * 71)) : 0;
    }
    if (ring.current) { ring.current.visible = show && S.theory.spread; ring.current.position.set(cx, y, z + 0.004); ring.current.scale.set(bl + 0.08, W + 0.08, 1); }
  });

  const get = () => {
    const S = vs.current, v = S.items[i];
    return { len: v?.flamePresent ? v.burnLen_m : lastBurn.current, width: W, q: S.qRatio, o2r: S.o2Ratio, o2hi: o2hi(S.x_o2), shape: S.shape, lean: S.lean, scale: v?.flamePresent ? 1 : v?.collapse ?? 0, visible: !!v && (v.flamePresent || v.collapse > 0) };
  };
  const v = vs.current.items[i];
  const name = materialByKey(it.material_key)?.display_name ?? it.material_key;
  const src = r ? r.provenance.sources.slice(0, 3).map((s) => s.source_id).filter(Boolean).join(", ") : "";

  return (
    <group>
      {/* holder: aluminium frame + two struts to the port rack */}
      <group>
        <mesh material={mats.alu} position={[x0 + L / 2, y + W / 2 + 0.012, z]} castShadow><boxGeometry args={[L + 0.05, 0.018, 0.02]} /></mesh>
        <mesh material={mats.alu} position={[x0 + L / 2, y - W / 2 - 0.012, z]} castShadow><boxGeometry args={[L + 0.05, 0.018, 0.02]} /></mesh>
        <mesh material={mats.alu} position={[x0 - 0.016, y, z]} castShadow><boxGeometry args={[0.018, W + 0.04, 0.02]} /></mesh>
        <mesh material={mats.alu} position={[x0 + L + 0.016, y, z]} castShadow><boxGeometry args={[0.018, W + 0.04, 0.02]} /></mesh>
        {[x0 + L * 0.2, x0 + L * 0.8].map((sx) => <mesh key={sx} material={mats.aluDark} position={[sx, y - W / 2 - 0.02, (z - MOD.HALF) / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.008, 0.008, Math.abs(z + MOD.HALF), 8]} /></mesh>)}
      </group>
      <mesh material={local.sample} position={[x0 + L / 2, y, z]} castShadow receiveShadow
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }} onPointerOut={() => setHover(false)}>
        <boxGeometry args={[L, W, th]} />
      </mesh>
      <mesh ref={charRef} geometry={local.charGeo} material={local.char} visible={false} />
      <group ref={zoneRef} visible={false}>
        <mesh material={local.zone}><boxGeometry args={[1, 1, 1]} /></mesh>
      </group>
      <group ref={flameG}><Flame get={get} reduced={reduced} /></group>
      <pointLight ref={light} color="#ff7a2e" intensity={0} distance={7} decay={1.6} />
      <group ref={ring} visible={false}><Line points={ringPts} color="#b9a3ff" dashed dashSize={0.02} gapSize={0.015} lineWidth={1.2} /></group>
      {hover && <Html position={[x0 + L / 2, y + W / 2 + 0.08, z]} center zIndexRange={[30, 0]}>
        <div className="glass pointer-events-none w-56 px-2 py-1 text-[11px]" data-testid="item-tooltip">
          <p className="font-medium">{name}</p>
          <p className="num text-mute">{sig(L * 100, 3)} × {sig(W * 100, 3)} cm · {v?.status ?? "idle"}</p>
          {v && r && <p className="num">front {sig(v.front_m * 100, 3)} cm · burning {sig(v.burnLen_m * 100, 3)} cm</p>}
          {src && <p className="text-faint">sources: {src}</p>}
        </div>
      </Html>}
    </group>
  );
}
