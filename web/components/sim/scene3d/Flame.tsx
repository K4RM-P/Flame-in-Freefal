"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Raymarched flame volume: 3D simplex-noise FBM inside a blended µg-hemisphere / 1 g-teardrop field.
// Size from the engine's burning length, Q and flow (Heskestad height, α/u sheath, wind tilt, puffing frequency;
// data/params/flame_visual.json), colour/brightness from O₂, µg ↔ 1 g blend from g^(1/3).
// Noise and flicker are seeded by wall-clock time only and are cosmetic; they never change scale, shape or colour.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; } return s; }
`;

const VERT = /* glsl */ `
varying vec3 vPos;
void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
`;

const FRAG = /* glsl */ `
${NOISE}
uniform vec3 uCam; uniform vec3 uSize; uniform vec3 uCenter;
uniform float uTime, uLen, uWidth, uT, uH, uShape, uLean, uQ, uO2r, uO2hi, uFlick, uHz;
varying vec3 vPos;
// metric local coords: x along the sample (front at +uLen/2), y across its width (up), z out of the sheet
float field(vec3 q){
  float qn = uQ;
  // lean: sample upstream so the flame trails downstream (−x)
  float h1 = clamp((q.y + uWidth*0.5) / (uWidth + uH), 0.0, 1.0);
  q.x += uLean * (mix(abs(q.z) * 1.6, h1 * uH * 0.8, uShape));
  // µg: hemispherical sheath hugging both faces, rounder at the leading edge
  float lead = q.x > 0.0 ? 1.35 : 1.0;
  vec3 du = vec3(max(abs(q.x) - uLen*0.5, 0.0) / (uT*lead), max(abs(q.y) - uWidth*0.45, 0.0) / (uT*1.2), abs(q.z) / uT);
  float dUg = length(du);
  // 1 g: teardrop rising above the burning zone
  float hh = (q.y + uWidth*0.5) / (uWidth + uH);
  float rz = uT * 1.6 * pow(clamp(1.0 - hh, 0.0, 1.0), 0.55) * smoothstep(-0.05, 0.12, hh) + 1e-4;
  float rx = (uLen*0.5 + uT) * (1.0 - 0.75*clamp(hh,0.0,1.0)) + 1e-4;
  float d1 = length(vec2(q.x / rx, q.z / rz));
  if (hh < -0.05 || hh > 1.0) d1 = 9.0;
  float d = mix(dUg, d1, uShape);
  if (d > 1.6) return 0.0; // far outside the envelope: skip the noise (keeps full-screen close-ups cheap)
  float speed = mix(0.6, 3.2, uShape);
  vec3 np = q * mix(26.0, 10.0, uShape) * vec3(1.0, mix(1.0, 0.55, uShape), 1.0) + vec3(0.0, -uTime * speed * uFlick, uTime*0.3);
  d += fbm(np) * mix(0.38, 0.6, uShape) + 0.12;
  d += uShape * uFlick * 0.08 * sin(uTime * 6.2832 * uHz - q.y * 18.0); // buoyant puffing at the correlation frequency (0 in µg)
  return smoothstep(0.0, 0.55, 1.0 - d);
}
void main(){
  vec3 ro = uCam, rd = normalize(vPos - uCam);
  vec3 inv = 1.0 / rd; vec3 t0 = (vec3(-0.5) - ro) * inv, t1 = (vec3(0.5) - ro) * inv;
  vec3 tmin = min(t0, t1), tmax = max(t0, t1);
  float tn = max(max(tmin.x, tmin.y), max(tmin.z, 0.0)), tf = min(min(tmax.x, tmax.y), tmax.z);
  // stop at the opaque sheet plane (z = 0) when the ray crosses it within the sample width
  float tz = -ro.z / rd.z;
  if (tz > tn && tz < tf) { vec3 hp = (ro + rd * tz) * uSize + uCenter; if (abs(hp.y) < uWidth * 0.5) tf = tz; }
  if (tf <= tn) discard;
  const int STEPS = 32; float dt = (tf - tn) / float(STEPS);
  float stepM = length(rd * uSize) * dt;
  vec3 col = vec3(0.0); float acc = 0.0;
  vec3 blue = vec3(0.20, 0.42, 1.0), orange = vec3(1.0, 0.42, 0.08), white = vec3(1.0, 0.86, 0.6), sootTip = vec3(0.45, 0.12, 0.02);
  for (int i = 0; i < STEPS; i++){
    vec3 p = ro + rd * (tn + dt * (float(i) + 0.5));
    vec3 q = p * uSize + uCenter;
    float den = field(q);
    if (den <= 0.001) continue;
    float core = smoothstep(0.15, 0.75, den);
    float edge = 1.0 - core;
    // blue CH* chemiluminescence at the base/leading edge; soot luminosity in the core (more with O₂)
    float soot = core * (0.35 + 0.65 * uO2hi) * mix(0.55, 1.0, uShape);
    vec3 c = blue * edge * 1.4 + mix(orange, white, uO2hi * core) * soot * 2.2;
    float hh = clamp((q.y + uWidth*0.5) / (uWidth + uH), 0.0, 1.0);
    c = mix(c, sootTip * 1.5, uShape * uO2hi * smoothstep(0.65, 1.0, hh) * 0.6);
    float bright = mix(0.55, 1.0, uShape) * (0.45 + 0.55 * clamp(uO2r, 0.0, 1.3));
    col += c * den * bright * stepM / max(0.004, uT * 2.2);
    acc += den * stepM;
  }
  col *= (0.35 + 0.65 * uQ);
  if (dot(col, vec3(1.0)) < 0.002) discard;
  col = col * 1.6 / (1.0 + 0.18 * col); // soft HDR shoulder: core stays > 1 for bloom without clipping to a white slab
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface FlameParams { len: number; width: number; q: number; o2r: number; o2hi: number; shape: number; lean: number; scale: number; visible: boolean; sheath: number; length: number; D: number; hz: number }

/** Flame dimensions (metres) from the VisualState physics: µg sheath thickness (α/u diffusion length) blended
 *  with the buoyant plume half-width (≈0.15 D), and plume height H = shape × Heskestad length (g-scaled). */
export function flameDims(p: { sheath: number; length: number; D: number; shape: number; scale?: number }) {
  const s = p.scale ?? 1;
  const T = (p.sheath + (Math.min(0.12, Math.max(0.02, 0.15 * p.D)) - p.sheath) * p.shape) * (0.4 + 0.6 * s);
  const H = p.shape * p.length * s;
  return { T, H };
}

/** `get` is read every frame (interpolated VisualState), so the flame moves smoothly between engine frames. */
export function Flame({ get, reduced }: { get: () => FlameParams; reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: Object.fromEntries(["uTime", "uLen", "uWidth", "uT", "uH", "uShape", "uLean", "uQ", "uO2r", "uO2hi", "uFlick", "uHz"].map((k) => [k, { value: 0 }] as [string, { value: unknown }]).concat([
      ["uCam", { value: new THREE.Vector3() }], ["uSize", { value: new THREE.Vector3(1, 1, 1) }], ["uCenter", { value: new THREE.Vector3() }]])),
  }), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    const m = mesh.current; if (!m) return;
    const p = get();
    m.visible = p.visible && p.scale > 0.01;
    if (!m.visible) return;
    const L = Math.max(0.004, p.len) * p.scale, W = Math.max(0.01, p.width), qq = Math.min(1, p.q * p.scale);
    const { T, H } = flameDims({ sheath: p.sheath, length: p.length, D: p.D, shape: p.shape, scale: p.scale });
    const pad = T * 2.2 + p.lean * 0.05, shift = p.lean * (T * 2 + H * 0.8);
    m.scale.set(L + pad * 2 + shift, W + H + pad * 2, T * (p.shape > 0 ? 3.2 : 2.4) * 2 + 0.01);
    m.position.set(-shift / 2, H / 2, 0);
    const u = mat.uniforms;
    u.uTime.value = reduced ? 0 : clock.elapsedTime;
    u.uLen.value = L; u.uWidth.value = W; u.uT.value = T; u.uH.value = H; u.uShape.value = p.shape; u.uLean.value = p.lean;
    u.uQ.value = qq; u.uO2r.value = p.o2r; u.uO2hi.value = p.o2hi; u.uFlick.value = reduced ? 0 : 1; u.uHz.value = p.hz;
    (u.uSize.value as THREE.Vector3).copy(m.scale); (u.uCenter.value as THREE.Vector3).copy(m.position);
    m.updateWorldMatrix(true, false);
    const local = m.worldToLocal(tmp.copy(camera.position));
    (u.uCam.value as THREE.Vector3).copy(local);
    const inside = Math.abs(local.x) < 0.5 && Math.abs(local.y) < 0.5 && Math.abs(local.z) < 0.5;
    mat.side = inside ? THREE.BackSide : THREE.FrontSide;
  });
  return <mesh ref={mesh} material={mat} renderOrder={10} frustumCulled={false} visible={false}><boxGeometry args={[1, 1, 1]} /></mesh>;
}
