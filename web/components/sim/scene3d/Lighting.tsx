"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Cabin lighting: a Lightformer-built environment (no HDRI fetched), the 6 LED panels as lights (2 with soft
// shadows), and a dim fill. Purely visual.
import { Environment, Lightformer } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { MOD } from "./Module";

const PANELS: [number, number][] = [[-2.65, -1], [-0.55, -1], [1.55, -1], [-2.65, 1], [-0.55, 1], [1.55, 1]];
const WARM = "#ffe7cf";

export function Lighting({ shadows }: { shadows: boolean }) {
  const c = MOD.HALF - 0.2;
  return (
    <>
      <hemisphereLight args={["#dfe6ee", "#3b3a38", 0.35]} />
      <Environment resolution={128} frames={1} background={false}>
        <color attach="background" args={["#2a2d31"]} />
        {PANELS.map(([x, s], i) => <Lightformer key={i} form="rect" intensity={3} color={WARM} position={[x, c, s * c]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 0.2, 1]} />)}
        <Lightformer form="rect" intensity={0.6} color="#cfd8e3" position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#d9e2ec" position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={1} />
      </Environment>
      {PANELS.map(([x, s], i) => i === 1 || i === 4
        ? <PanelSpot key={i} x={x} z={s * c} shadows={shadows && i === 1 || shadows && i === 4} />
        : <pointLight key={i} position={[x, c - 0.1, s * (c - 0.1)]} intensity={0.85} distance={4.5} decay={1.6} color={WARM} />)}
    </>
  );
}

function PanelSpot({ x, z, shadows }: { x: number; z: number; shadows: boolean }) {
  const ref = useRef<THREE.SpotLight>(null);
  useLayoutEffect(() => {
    const l = ref.current; if (!l) return;
    l.target.position.set(x + 0.2, -MOD.HALF, -z * 0.4); l.target.updateMatrixWorld();
    l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.radius = 4; l.shadow.camera.near = 0.05; l.shadow.camera.far = 5;
  }, [x, z]);
  return <spotLight ref={ref} position={[x, MOD.HALF - 0.25, z * 0.98]} angle={1.15} penumbra={0.9} intensity={4.2} distance={6} decay={1.4} color={WARM} castShadow={shadows} />;
}
