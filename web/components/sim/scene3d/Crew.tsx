"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Optional procedural crew figure (~1.75 m, capsules): dark-blue polo, khaki trousers, smooth faceless head.
// No faces, names or patches. Floats by the hatch holding a rail in µg (slow bob); stands on the deck when g > 0.
// Turns its head toward the alarm beacon once the engine's alarm event has fired.
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { getMats } from "./materials";
import { ANCHORS, MOD } from "./Module";
import { useVis } from "./vis";

function Limb({ from, to, r, mat }: { from: [number, number, number]; to: [number, number, number]; r: number; mat: THREE.Material }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), len = Math.max(0.01, d.length() - 2 * r);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return <mesh position={a.clone().lerp(b, 0.5)} quaternion={q} material={mat} castShadow><capsuleGeometry args={[r, len, 6, 12]} /></mesh>;
}

export function Crew() {
  const { vs, reduced, layout, sc } = useVis();
  const m = getMats();
  const body = useRef<THREE.Group>(null), head = useRef<THREE.Group>(null);
  const ug = sc.cabin.gravity_g <= 0;
  const beacon = new THREE.Vector3(layout.detector.x + 0.3, MOD.HALF - 0.06, ANCHORS.beaconZ);
  const tmp = useRef(new THREE.Vector3());
  useFrame(({ clock }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    if (body.current) {
      const base = ANCHORS.crew;
      if (ug) { body.current.position.set(base.x, -MOD.HALF + 0.12 + Math.sin(t * 0.5) * 0.03, base.z); body.current.rotation.set(0.12 + Math.sin(t * 0.3) * 0.02, -1.25, 0.18); }
      else { body.current.position.set(base.x + 0.25, -MOD.HALF, base.z); body.current.rotation.set(0, -1.35, 0); }
    }
    if (head.current) {
      let want = 0;
      if (vs.current.alarm) {
        head.current.parent!.worldToLocal(tmp.current.copy(beacon));
        want = Math.max(-1.1, Math.min(1.1, Math.atan2(tmp.current.x - head.current.position.x, tmp.current.z - head.current.position.z)));
      }
      head.current.rotation.y += (want - head.current.rotation.y) * Math.min(1, (reduced ? 1 : dt * 3));
    }
  });
  const S = m.crewShirt, P = m.crewPants, H = m.crewHead;
  return (
    <group ref={body}>
      {/* origin at the feet in 1 g; in µg the same skeleton floats (knees slightly bent, one hand on a rail) */}
      <Limb from={[-0.1, 0.08, 0]} to={[-0.1, 0.5, ug ? 0.06 : 0]} r={0.065} mat={P} />
      <Limb from={[-0.1, 0.5, ug ? 0.06 : 0]} to={[-0.1, 0.9, 0]} r={0.075} mat={P} />
      <Limb from={[0.1, 0.08, ug ? 0.12 : 0]} to={[0.1, 0.5, ug ? 0.16 : 0]} r={0.065} mat={P} />
      <Limb from={[0.1, 0.5, ug ? 0.16 : 0]} to={[0.1, 0.9, 0]} r={0.075} mat={P} />
      <mesh position={[-0.1, 0.05, 0.05]} material={m.plastic}><boxGeometry args={[0.1, 0.06, 0.24]} /></mesh>
      <mesh position={[0.1, 0.05, ug ? 0.17 : 0.05]} material={m.plastic}><boxGeometry args={[0.1, 0.06, 0.24]} /></mesh>
      <mesh position={[0, 0.98, 0]} material={P} castShadow><capsuleGeometry args={[0.15, 0.12, 6, 12]} /></mesh>
      <mesh position={[0, 1.27, 0]} material={S} castShadow><capsuleGeometry args={[0.175, 0.3, 6, 14]} /></mesh>
      <Limb from={[-0.22, 1.42, 0]} to={[-0.27, 1.13, 0.08]} r={0.052} mat={S} />
      <Limb from={[-0.27, 1.13, 0.08]} to={[-0.25, 0.92, 0.2]} r={0.042} mat={H} />
      {/* right arm up to the handrail */}
      <Limb from={[0.22, 1.42, 0]} to={[0.32, 1.66, 0.12]} r={0.052} mat={S} />
      <Limb from={[0.32, 1.66, 0.12]} to={[0.3, 1.86, 0.26]} r={0.042} mat={H} />
      <mesh position={[0, 1.55, 0]} material={H}><cylinderGeometry args={[0.05, 0.055, 0.08, 12]} /></mesh>
      <group ref={head} position={[0, 1.66, 0]}>
        <mesh material={H} scale={[1, 1.18, 1.05]} castShadow><sphereGeometry args={[0.1, 24, 18]} /></mesh>
      </group>
    </group>
  );
}
