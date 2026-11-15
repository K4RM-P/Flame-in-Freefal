"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Event-driven cabin systems: smoke detector (+ alarm beacon), supply/return vents with fan and ribbons, airflow
// streaks, suppression nozzle and agent burst, and the laptop's live readout. States come only from VisualState.
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { sig } from "@/lib/ui/format";
import { getMats } from "./materials";
import { ANCHORS, MOD } from "./Module";
import { PARTICLE_FRAG, particleGeometry } from "./Smoke";
import { useVis } from "./vis";

const BURST_VERT = /* glsl */ `
attribute vec4 seed;
uniform float uAge, uStrength, uPx; uniform vec3 uOrigin;
varying float vA;
void main(){
  vec3 dir = normalize(vec3(seed.y - 0.5, seed.z - 0.75, seed.w - 0.5) + 1e-3);
  float rr = 1.7 * sqrt(clamp(uAge / 2.5, 0.0, 1.0)) * (0.3 + 0.7 * seed.x);
  vec3 p = uOrigin + dir * rr;
  vA = uStrength;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (0.04 + 0.12 * seed.x) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const STREAK_VERT = /* glsl */ `
attribute vec4 seed;
uniform float uTime, uSpeed, uFade, uPx, uX0, uX1;
varying float vA;
void main(){
  float len = uX1 - uX0; float u = fract(uTime * uSpeed / len + seed.x);
  vec3 p = vec3(uX1 - u * len, (seed.y - 0.5) * 1.7, (seed.z - 0.5) * 1.7);
  vA = uFade * smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.85, u) * 0.6;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.5, uPx * 0.0035 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

export function Systems() {
  const { vs, reduced, layers, layout, sc } = useVis();
  const mats = getMats();
  const { size, gl } = useThree();
  const det = layout.detector;
  const led = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 0.5), toneMapped: false }), []);
  const beaconMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a86a12", emissive: new THREE.Color("#ffa21f"), emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.92 }), []);
  const beaconLight = useRef<THREE.PointLight>(null);
  const fan = useRef<THREE.Group>(null);
  const ribbons = useRef<THREE.Group>(null);
  const fanAngle = useRef(0);
  const burst = useMemo(() => ({ geo: particleGeometry(900, "agent"), mat: new THREE.ShaderMaterial({ vertexShader: BURST_VERT, fragmentShader: PARTICLE_FRAG, transparent: true, depthWrite: false,
    uniforms: { uAge: { value: 0 }, uStrength: { value: 0 }, uPx: { value: 300 }, uOrigin: { value: ANCHORS.nozzle.clone() }, uColor: { value: new THREE.Color("#f2f4f7") }, uOpacity: { value: 0.55 } } }) }), []);
  const burstRef = useRef<THREE.Points>(null);
  const streak = useMemo(() => ({ geo: particleGeometry(500, "flow"), mat: new THREE.ShaderMaterial({ vertexShader: STREAK_VERT, fragmentShader: PARTICLE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSpeed: { value: 0.6 }, uFade: { value: 0 }, uPx: { value: 300 }, uX0: { value: MOD.X0 }, uX1: { value: MOD.X1 }, uColor: { value: new THREE.Color("#6fb4ff") }, uOpacity: { value: 0.45 } } }) }), []);
  const ribbonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.8, side: THREE.DoubleSide }), []);
  const screen = useMemo(() => { const c = document.createElement("canvas"); c.width = 320; c.height = 200; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t, last: "" }; }, []);
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: screen.t, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }), [screen]);

  useFrame(({ clock }, dt) => {
    const S = vs.current, t = reduced ? 0 : clock.elapsedTime;
    const px = size.height * gl.getPixelRatio();
    // detector + beacon (alarm event only)
    led.color.setRGB(S.alarm ? 3 : 0.2, S.alarm ? 0.15 : 1.6, S.alarm ? 0.1 : 0.5);
    const pulse = S.alarm ? (reduced ? 1 : 0.5 + 0.5 * Math.max(0, Math.sin(t * 8))) : 0;
    beaconMat.emissiveIntensity = pulse * 4;
    if (beaconLight.current) beaconLight.current.intensity = pulse * 3;
    // fan spin-down after fan_off (cosmetic speed), ribbons hang still when the fan stops
    fanAngle.current += (reduced ? 0 : 1) * S.fanSpeed * 18 * dt;
    if (fan.current) fan.current.rotation.z = fanAngle.current;
    if (ribbons.current) ribbons.current.children.forEach((c, k) => { c.rotation.x = S.fanSpeed > 0 ? (0.9 + 0.25 * Math.sin(t * 9 + k * 1.3)) * S.fanSpeed : 0; });
    // airflow streaks
    const su = streak.mat.uniforms; su.uTime.value = t; su.uFade.value = layers.airflow ? S.fanSpeed * (S.fanOff ? 0 : 1) : 0; su.uPx.value = px; su.uSpeed.value = 0.35 + S.flow_m_s * 3;
    // agent burst from the nozzle (engine agent_released event; ≈2.5 s of sim time)
    const bu = burst.mat.uniforms;
    if (burstRef.current) burstRef.current.visible = !!S.agent && layers.suppression;
    if (S.agent) { bu.uAge.value = S.agent.age_s; bu.uStrength.value = S.agent.strength; bu.uPx.value = px; (bu.uColor.value as THREE.Color).set(S.agent.kind === "N2" ? "#cfe3ff" : "#f2f4f7"); }
    // laptop live readout (redrawn only when the engine frame changes)
    const key = `${S.frame}|${S.alarm}|${S.hasRun}`;
    if (key !== screen.last) {
      screen.last = key; const g = screen.c.getContext("2d")!;
      g.fillStyle = "#07121b"; g.fillRect(0, 0, 320, 200); g.fillStyle = S.alarm ? "#b3261e" : "#164b66"; g.fillRect(0, 0, 320, 34);
      g.fillStyle = "#fff"; g.font = "bold 20px monospace"; g.fillText(S.alarm ? "FIRE ALARM" : "CABIN MONITOR", 12, 24);
      g.font = "18px monospace"; g.fillStyle = "#cfe6f2";
      const h = S.hud;
      g.fillText(`t   ${S.hasRun ? sig(S.t, 3) : "—"} s`, 14, 66);
      g.fillText(`T   ${h.T_K != null ? sig(h.T_K, 4) : "—"} K`, 14, 96);
      g.fillText(`O2  ${h.x_o2 != null ? sig(h.x_o2 * 100, 3) : "—"} %`, 14, 126);
      g.fillText(`CO  ${h.x_co_ppm != null ? sig(h.x_co_ppm, 3) : "—"} ppm`, 14, 156);
      g.fillStyle = "#7c93a1"; g.font = "13px monospace"; g.fillText(`engine frame ${S.hasRun ? S.frame + 1 : 0}/${S.N}`, 14, 186);
      screen.t.needsUpdate = true;
    }
  });

  const sv = ANCHORS.supplyVent, rv = ANCHORS.returnVent;
  return (
    <group>
      {layers.detector && <group position={det}>
        <mesh material={mats.panel} castShadow><cylinderGeometry args={[0.07, 0.075, 0.03, 24]} /></mesh>
        <mesh material={mats.aluDark} position={[0, -0.017, 0]}><cylinderGeometry args={[0.045, 0.045, 0.006, 24]} /></mesh>
        <mesh material={led} position={[0.045, -0.018, 0]}><sphereGeometry args={[0.006, 8, 8]} /></mesh>
      </group>}
      {/* amber alarm beacon on the overhead next to the detector */}
      <group position={[det.x + 0.3, MOD.HALF - 0.03, ANCHORS.beaconZ]}>
        <mesh material={mats.aluDark}><cylinderGeometry args={[0.04, 0.04, 0.02, 16]} /></mesh>
        <mesh material={beaconMat} position={[0, -0.035, 0]}><sphereGeometry args={[0.035, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <pointLight ref={beaconLight} color="#ffa21f" intensity={0} distance={3} decay={1.5} position={[0, -0.1, 0]} />
      </group>
      {/* supply vent (upstream, starboard) with fan and ribbons; return vent (port) */}
      <group position={sv}>
        <mesh material={mats.aluDark} position={[0, 0, -0.02]}><boxGeometry args={[0.46, 0.34, 0.04]} /></mesh>
        <mesh material={mats.dark} position={[0, 0, -0.041]}><circleGeometry args={[0.14, 24]} /></mesh>
        <group ref={fan} position={[0, 0, -0.035]}>
          {[0, 1, 2, 3, 4].map((k) => <mesh key={k} material={mats.alu} rotation={[0, 0.4, (k * Math.PI * 2) / 5]} position={[Math.cos((k * Math.PI * 2) / 5) * 0.06, Math.sin((k * Math.PI * 2) / 5) * 0.06, 0]}><boxGeometry args={[0.11, 0.035, 0.003]} /></mesh>)}
        </group>
        {Array.from({ length: 7 }, (_, k) => <mesh key={k} material={mats.alu} position={[0, -0.15 + k * 0.05, -0.045]}><boxGeometry args={[0.44, 0.008, 0.01]} /></mesh>)}
        <group ref={ribbons} position={[0, 0.16, -0.05]}>
          {[-0.15, -0.05, 0.05, 0.15].map((x) => <group key={x} position={[x, 0, 0]}><mesh material={ribbonMat} position={[0, -0.09, 0]}><planeGeometry args={[0.025, 0.18]} /></mesh></group>)}
        </group>
      </group>
      <group position={rv}>
        <mesh material={mats.aluDark} position={[0, 0, 0.02]}><boxGeometry args={[0.5, 0.3, 0.04]} /></mesh>
        {Array.from({ length: 6 }, (_, k) => <mesh key={k} material={mats.dark} position={[0, -0.12 + k * 0.048, 0.042]}><boxGeometry args={[0.46, 0.02, 0.006]} /></mesh>)}
      </group>
      <points geometry={streak.geo} material={streak.mat} frustumCulled={false} renderOrder={4} />
      {/* suppression nozzle */}
      {sc.suppression.agent !== "none" && <group position={ANCHORS.nozzle}>
        <mesh material={mats.aluDark} position={[0, 0.03, 0]}><cylinderGeometry args={[0.012, 0.012, 0.06, 8]} /></mesh>
        <mesh material={mats.alu}><cylinderGeometry args={[0.012, 0.03, 0.04, 12]} /></mesh>
      </group>}
      <points ref={burstRef} geometry={burst.geo} material={burst.mat} frustumCulled={false} renderOrder={6} visible={false} />
      {/* laptop live readout (engine frame) */}
      <mesh material={screenMat} position={ANCHORS.laptopScreen} rotation={[0, Math.PI + 0.35, 0]}><planeGeometry args={[0.3, 0.19]} /></mesh>
      {layers.labels && <>
        <Tag p={det} text={`Smoke detector · d = ${sig(sc.detection.distance_m, 3)} m${layout.detClamped ? " (clamped to module)" : ""}`} />
        <Tag p={layout.sampleCenter.clone().add(new THREE.Vector3(0, 0.25, 0))} text="Sample holder (to scale)" />
        <Tag p={sv} text="Supply vent / fan" />
        <Tag p={rv} text="Return vent" />
        {sc.suppression.agent !== "none" && <Tag p={ANCHORS.nozzle} text={`${sc.suppression.agent} nozzle`} />}
        <Tag p={ANCHORS.hatch} text="Hatch" />
      </>}
    </group>
  );
}

function Tag({ p, text }: { p: THREE.Vector3; text: string }) {
  return <Html position={p} center zIndexRange={[20, 0]}><span className="glass pointer-events-none whitespace-nowrap px-1.5 py-0.5 text-[11px]">{text}</span></Html>;
}
