"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// GPU smoke particles (stateless: positions from per-particle seeds + time in the vertex shader) and cabin haze.
// Emission and opacity ∝ smoke_det / max(smoke_det) from the engine; drift follows the engine flow (0 after fan-off);
// in µg the plume diffuses spherically with no rise; with g > 0 it rises. No yield / no smoke parameter → no particles.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "./textures";
import { ANCHORS } from "./Module";
import { useVis } from "./vis";

const N = 1600;
export const PARTICLE_VERT = /* glsl */ `
attribute vec4 seed;
uniform float uTime, uEmit, uFlow, uRise, uLife, uR, uPx;
uniform vec3 uOrigin;
varying float vA;
void main(){
  float age = fract(uTime / uLife + seed.x);
  vec3 dir = normalize(vec3(seed.y - 0.5, seed.z - 0.5, seed.w - 0.5) + 1e-3);
  vec3 p = uOrigin + dir * uR * sqrt(age) * (0.4 + seed.z) + vec3(-uFlow * age * uLife, uRise * age * uLife, 0.0);
  vA = (seed.y < uEmit ? 1.0 : 0.0) * smoothstep(0.0, 0.12, age) * (1.0 - age);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPx * (0.05 + 0.22 * age) / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
export const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity;
varying float vA;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c);
  if (d > 0.25 || vA <= 0.0) discard;
  gl_FragColor = vec4(uColor, uOpacity * vA * (1.0 - d * 4.0));
}`;

export function particleGeometry(n: number, seed: string) {
  const g = new THREE.BufferGeometry(), r = rng(seed), s = new Float32Array(n * 4);
  for (let i = 0; i < s.length; i++) s[i] = r();
  g.setAttribute("seed", new THREE.BufferAttribute(s, 4));
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  return g;
}
export function particleMaterial(color: string, blending: THREE.Blending = THREE.NormalBlending) {
  return new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG, transparent: true, depthWrite: false, blending,
    uniforms: { uTime: { value: 0 }, uEmit: { value: 0 }, uFlow: { value: 0 }, uRise: { value: 0 }, uLife: { value: 6 }, uR: { value: 0.4 }, uPx: { value: 300 },
      uOrigin: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
  });
}

export function Smoke() {
  const { vs, reduced, layers, layout } = useVis();
  const geo = useMemo(() => particleGeometry(N, "smoke"), []);
  const mat = useMemo(() => particleMaterial("#7d838b"), []);
  const pts = useRef<THREE.Points>(null);
  const { scene, size, gl } = useThree();
  const fog = useMemo(() => new THREE.FogExp2("#5a6068", 0), []);
  useEffect(() => { scene.fog = fog; return () => { scene.fog = null; }; }, [scene, fog]);
  useFrame(({ clock }) => {
    const S = vs.current, u = mat.uniforms;
    const on = layers.smoke && S.hasRun && !S.smokeNoData && S.smoke > 0;
    if (pts.current) pts.current.visible = on;
    fog.density = layers.smoke && !S.smokeNoData ? 0.12 * S.smoke : 0;
    if (!on) return;
    const b = S.items.findIndex((x) => x.flamePresent) >= 0 ? S.items.findIndex((x) => x.flamePresent) : 0;
    const it = S.items[b];
    (u.uOrigin.value as THREE.Vector3).set(layout.itemX[b] + Math.max(0, it.front_m - it.burnLen_m / 2), ANCHORS.sample.y, ANCHORS.sample.z);
    u.uTime.value = reduced ? 2.5 : clock.elapsedTime;
    u.uEmit.value = S.smoke; u.uOpacity.value = 0.18 + 0.4 * S.smoke;
    u.uFlow.value = S.flow_m_s * 1.5; u.uRise.value = S.gravity_g > 0 ? 0.12 * Math.sqrt(S.gravity_g) : 0;
    u.uR.value = S.gravity_g > 0 ? 0.35 : 0.9; u.uLife.value = S.gravity_g > 0 ? 6 : 9;
    u.uPx.value = size.height * gl.getPixelRatio() * 0.9;
  });
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} visible={false} />;
}
