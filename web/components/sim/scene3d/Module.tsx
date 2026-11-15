"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Illustrative lab-style pressurized module interior, fully procedural: a 2.1 m square aisle bounded by four rack
// faces with 45° chamfered corners, ring frames with fasteners, closeouts, conical end bulkheads and a hatch.
// Static meshes are merged per material; repeated parts are instanced. Purely visual: no engine imports.
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GeoBag, getMats, inst, type MatKey } from "./materials";
import { atlasUV, rng, tileOf, type LabelKind } from "./textures";

/** Module scale (metres). Geometry is illustrative; the cabin volume used by the engine comes from the scenario. */
export const MOD = { HALF: 1.05, CHAMF: 0.175, LEN: 8.5, X0: -4.25, X1: 4.25, BAY: 1.05, CONE: 0.6, HATCH_R: 0.72 } as const;
const FACE = MOD.HALF - MOD.CHAMF; // half-extent of a flat rack face

/** Fixed attachment points the fire, smoke and systems components read their positions from. */
export const ANCHORS = {
  /** Leading edge (x), centre height (y) and plane (z) of the sample holder; items extend along +x from here. */
  sample: new THREE.Vector3(0.3, 0.05, -0.5),
  /** Overhead plane where the detector sits; its x is sample.x − d (detection distance, to scale). */
  detectorY: MOD.HALF - 0.035, detectorZ: -0.4,
  nozzle: new THREE.Vector3(0.75, MOD.HALF - 0.06, 0.45),
  supplyVent: new THREE.Vector3(3.3, 0.2, MOD.HALF - 0.02),
  returnVent: new THREE.Vector3(-3.4, -0.25, -MOD.HALF + 0.02),
  beaconZ: 0.55,
  laptopScreen: new THREE.Vector3(-1.05, 0.15, MOD.HALF - 0.42),
  crew: new THREE.Vector3(-3.55, -0.1, 0.35),
  hatch: new THREE.Vector3(MOD.X0 - MOD.CONE, 0, 0),
  /** Camera clamp box: 0.15 m inside the rack faces. */
  camBox: new THREE.Box3(new THREE.Vector3(MOD.X0 - 0.3, -MOD.HALF + 0.15, -MOD.HALF + 0.15), new THREE.Vector3(MOD.X1 - 0.15, MOD.HALF - 0.15, MOD.HALF - 0.15)),
};

export type Wall = "deck" | "overhead" | "port" | "starboard";
export const WALLS: Wall[] = ["deck", "overhead", "port", "starboard"];
/** Wall-local frame: u along the module axis (x), v across the face, n out of the face into the aisle. */
export function wallMatrix(w: Wall): THREE.Matrix4 {
  const X = new THREE.Vector3(1, 0, 0), m = new THREE.Matrix4();
  const H = MOD.HALF;
  if (w === "deck") m.makeBasis(X, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)).setPosition(0, -H, 0);
  if (w === "overhead") m.makeBasis(X, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)).setPosition(0, H, 0);
  if (w === "port") m.makeBasis(X, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)).setPosition(0, 0, -H);
  if (w === "starboard") m.makeBasis(X, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1)).setPosition(0, 0, H);
  return m;
}
export const wallNormal = (w: Wall) => new THREE.Vector3(0, 0, 1).transformDirection(wallMatrix(w));
export const wallPoint = (w: Wall, u: number, v: number, n: number) => new THREE.Vector3(u, v, n).applyMatrix4(wallMatrix(w));

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function label(bag: GeoBag, m: THREE.Matrix4, u: number, v: number, n: number, w: number, h: number, tile: number) {
  const g = new THREE.PlaneGeometry(w, h); const [u0, v0, u1, v1] = atlasUV(tile); const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  g.translate(u, v, n); g.applyMatrix4(m); bag.add("label", g);
}

type Panel = "blank" | "drawers" | "grille" | "screen" | "toggles" | "connectors";
const PANELS: Panel[] = ["blank", "drawers", "grille", "screen", "toggles", "connectors", "drawers", "blank"];

/** One rack bay (or closeout) on a wall: backing, 3–6 sub-panels with 4 mm seams, hardware and labels. */
function rack(bag: GeoBag, fast: THREE.Matrix4[], knobs: THREE.Matrix4[], jacks: THREE.Matrix4[], w: Wall, uc: number, idx: number, closeout: boolean, r: () => number) {
  const m = wallMatrix(w), N = wallNormal(w);
  const W = MOD.BAY - 0.05, top = FACE - 0.02, bot = -FACE + 0.02;
  bag.box("dark", V(uc, 0, 0.004), V(MOD.BAY - 0.01, FACE * 2, 0.008), m);
  const k = closeout ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 4);
  const weights = Array.from({ length: k }, () => 0.5 + r()); const sum = weights.reduce((a, b) => a + b, 0);
  let v = bot;
  for (let i = 0; i < k; i++) {
    const h = ((top - bot) * weights[i]) / sum, vc = v + h / 2; v += h;
    const ph = h - 0.004, pw = W - 0.004, n0 = 0.008;
    const type: Panel = closeout ? (r() > 0.7 ? "grille" : "blank") : PANELS[Math.floor(r() * PANELS.length)];
    const mat: MatKey = r() > 0.5 ? "panel" : "panelAlt";
    if (type === "grille") {
      bag.box("dark", V(uc, vc, n0 + 0.008), V(pw, ph, 0.016), m);
      const nS = Math.max(4, Math.floor(ph / 0.03));
      for (let s = 0; s < nS; s++) bag.box("aluDark", V(uc, vc - ph / 2 + (s + 0.5) * (ph / nS), n0 + 0.02), V(pw - 0.04, 0.008, 0.012), m);
      bag.box("panel", V(uc, vc + ph / 2 - 0.01, n0 + 0.018), V(pw, 0.02, 0.02), m); bag.box("panel", V(uc, vc - ph / 2 + 0.01, n0 + 0.018), V(pw, 0.02, 0.02), m);
    } else {
      bag.box(mat, V(uc, vc, n0 + 0.0125), V(pw, ph, 0.025), m);
    }
    const face = n0 + 0.025;
    if (type === "drawers") {
      const nd = 2 + Math.floor(r() * 3), dh = ph / nd;
      for (let d = 0; d < nd; d++) {
        const dv = vc - ph / 2 + (d + 0.5) * dh;
        bag.box(mat, V(uc, dv, face + 0.006), V(pw - 0.03, dh - 0.008, 0.012), m);
        bag.box("dark", V(uc, dv + dh * 0.22, face + 0.0125), V(0.16, 0.026, 0.002), m);           // recessed pull
        bag.box("alu", V(uc, dv + dh * 0.22, face + 0.016), V(0.13, 0.012, 0.008), m);
        for (const su of [-1, 1]) inst(fast, wallPoint(w, uc + su * (pw / 2 - 0.035), dv, face + 0.013), N, 1);
      }
    } else if (type === "screen") {
      bag.box("plastic", V(uc - pw * 0.15, vc, face + 0.008), V(Math.min(0.34, pw * 0.5), Math.min(0.22, ph * 0.7), 0.016), m);
      const sg = new THREE.PlaneGeometry(Math.min(0.3, pw * 0.45), Math.min(0.18, ph * 0.6)); sg.translate(uc - pw * 0.15, vc, face + 0.017); sg.applyMatrix4(m); bag.add("screen", sg);
      for (let b = 0; b < 4; b++) inst(knobs, wallPoint(w, uc + pw * 0.22, vc - 0.06 + b * 0.04, face), N, 0.8, 1.2);
    } else if (type === "toggles") {
      const nt = 6 + Math.floor(r() * 5);
      for (let t = 0; t < nt; t++) {
        const tu = uc - pw / 2 + 0.08 + (t * (pw - 0.16)) / (nt - 1);
        inst(knobs, wallPoint(w, tu, vc, face), N, 0.55, 2.2);
        bag.box("aluDark", V(tu, vc - 0.03, face + 0.008), V(0.03, 0.008, 0.016), m);
      }
      label(bag, m, uc, vc + Math.min(0.06, ph * 0.3), face + 0.001, 0.32, 0.03, tileOf("text", idx + Math.floor(r() * 12)));
    } else if (type === "connectors") {
      const cols = 4 + Math.floor(r() * 4), rows = Math.max(1, Math.min(3, Math.floor(ph / 0.09)));
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++)
        inst(jacks, wallPoint(w, uc - pw / 2 + 0.09 + (a * (pw - 0.18)) / Math.max(1, cols - 1), vc - ((rows - 1) * 0.07) / 2 + b * 0.07, face), N, 0.9 + (a % 2) * 0.5, 1);
    } else {
      for (const su of [-1, 1]) for (const sv of [-1, 1]) inst(fast, wallPoint(w, uc + su * (pw / 2 - 0.025), vc + sv * (ph / 2 - 0.025), face), N, 1);
    }
    if (r() > 0.55) label(bag, m, uc + pw * 0.28, vc - ph * 0.32, face + 0.0015, 0.18, 0.045, tileOf((["barcode", "text", "caution"] as LabelKind[])[Math.floor(r() * 3)], Math.floor(r() * 12)));
  }
  if (!closeout) label(bag, m, uc - W / 2 + 0.14, top - 0.04, 0.036, 0.2, 0.05, tileOf("id", idx));
}

/** Ring point on the chamfered-square aisle cross-section at angle θ (y–z plane). */
function octPoint(theta: number, inset = 0) {
  const c = Math.cos(theta), s = Math.sin(theta), H = MOD.HALF - inset, D = (MOD.HALF * 2 - MOD.CHAMF) - inset * 1.414;
  const t = Math.min(H / Math.max(1e-6, Math.abs(c)), H / Math.max(1e-6, Math.abs(s)), D / Math.max(1e-6, Math.abs(c) + Math.abs(s)));
  return [c * t, s * t] as const; // [y, z]
}

/** Conical end bulkhead: lofts the aisle cross-section into a round hatch ring. sign −1 = far end, +1 = near end. */
function endCone(bag: GeoBag, sign: number) {
  const seg = 48, rings = 4, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const xa = sign < 0 ? MOD.X0 : MOD.X1, xb = xa + sign * MOD.CONE;
  for (let j = 0; j <= rings; j++) {
    const u = j / rings, e = u * u * (3 - 2 * u);
    for (let i = 0; i <= seg; i++) {
      const th = (i / seg) * Math.PI * 2, [oy, oz] = octPoint(th), cy = Math.cos(th) * (MOD.HATCH_R + 0.08), cz = Math.sin(th) * (MOD.HATCH_R + 0.08);
      pos.push(xa + (xb - xa) * u, oy + (cy - oy) * e, oz + (cz - oz) * e); uv.push(i / seg * 6, u);
    }
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1;
    if (sign < 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  bag.add("panelAlt", g);
  // stiffener rings on the cone
  for (const u of [0.35, 0.7]) { const tg = new THREE.TorusGeometry(MOD.HATCH_R + 0.08 + (1 - u) * 0.55, 0.012, 6, 48); tg.rotateY(Math.PI / 2); tg.translate(xa + (xb - xa) * u, 0, 0); bag.add("aluDark", tg); }
  // bulkhead + hatch
  const disc = new THREE.CircleGeometry(MOD.HATCH_R + 0.1, 48); disc.rotateY(sign < 0 ? Math.PI / 2 : -Math.PI / 2); disc.translate(xb, 0, 0); bag.add("aluDark", disc);
  const ring = new THREE.TorusGeometry(MOD.HATCH_R - 0.02, 0.035, 8, 48); ring.rotateY(Math.PI / 2); ring.translate(xb - sign * 0.02, 0, 0); bag.add("alu", ring);
  const door = new THREE.CylinderGeometry(MOD.HATCH_R - 0.06, MOD.HATCH_R - 0.06, 0.05, 48); door.rotateZ(Math.PI / 2); door.translate(xb - sign * 0.03, 0, 0); bag.add("panel", door);
  const hub = xb - sign * 0.11;
  const wheel = new THREE.TorusGeometry(0.17, 0.016, 8, 32); wheel.rotateY(Math.PI / 2); wheel.translate(hub, -0.08, 0); bag.add("alu", wheel);
  for (let k = 0; k < 4; k++) { const sp = new THREE.CylinderGeometry(0.01, 0.01, 0.34, 6); sp.rotateX((k * Math.PI) / 4); sp.translate(hub, -0.08, 0); bag.add("alu", sp); }
  const boss = new THREE.CylinderGeometry(0.04, 0.05, 0.08, 16); boss.rotateZ(Math.PI / 2); boss.translate(xb - sign * 0.07, -0.08, 0); bag.add("aluDark", boss);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, ry = Math.cos(a) * (MOD.HATCH_R - 0.12), rz = Math.sin(a) * (MOD.HATCH_R - 0.12);
    bag.box("aluDark", V(xb - sign * 0.065, ry, rz), V(0.03, 0.05, 0.05)); // latch body
    const lever = new THREE.BoxGeometry(0.018, 0.16, 0.022); lever.rotateX(a + Math.PI / 2); lever.translate(xb - sign * 0.085, ry * 0.86, rz * 0.86); bag.add("yellow", lever);
  }
  if (sign < 0) {
    const win = new THREE.CircleGeometry(0.085, 32); win.rotateY(Math.PI / 2); win.translate(xb - sign * 0.058, 0.36, 0); bag.add("hatchGlow", win);
    const wr = new THREE.TorusGeometry(0.095, 0.018, 8, 32); wr.rotateY(Math.PI / 2); wr.translate(xb - sign * 0.058, 0.36, 0); bag.add("aluDark", wr);
    label(bag, new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(xb - sign * 0.06, 0, 0), 0.18, -0.5, 0, 0.26, 0.06, tileOf("caution", 1));
  }
}

export function buildModule(): { meshes: [MatKey, THREE.BufferGeometry][]; fasteners: THREE.Matrix4[]; knobs: THREE.Matrix4[]; jacks: THREE.Matrix4[] } {
  const bag = new GeoBag(), fast: THREE.Matrix4[] = [], knobs: THREE.Matrix4[] = [], jacks: THREE.Matrix4[] = [];
  const r = rng("module-racks");
  let idx = 0;
  for (const w of WALLS) for (let b = 0; b < 8; b++) {
    const uc = MOD.X0 + 0.025 + MOD.BAY * (b + 0.5);
    rack(bag, fast, knobs, jacks, w, uc, idx++, b < 2 || b > 5, r);
  }
  // 45° chamfer utility channels (cables run here)
  for (const [sy, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), sy * sz > 0 ? -Math.PI / 4 : Math.PI / 4);
    const c = (MOD.HALF - MOD.CHAMF / 2) + 0.01;
    bag.box("aluDark", V(0, sy * c, sz * c), V(MOD.LEN, MOD.CHAMF * 1.414, 0.01), undefined, q);
  }
  // ring frames every bay with fastener heads (instanced)
  for (let k = 0; k <= 8; k++) {
    const x = MOD.X0 + 0.025 + k * MOD.BAY;
    for (const w of WALLS) {
      const m = wallMatrix(w), N = wallNormal(w);
      bag.box("alu", V(x, 0, 0.018), V(0.05, FACE * 2, 0.036), m);
      for (let s = 0; s < 22; s++) inst(fast, wallPoint(w, x, -FACE + 0.04 + s * ((FACE * 2 - 0.08) / 21), 0.036), N, 1);
    }
    for (const [sy, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), sy * sz > 0 ? -Math.PI / 4 : Math.PI / 4);
      const c = MOD.HALF - MOD.CHAMF / 2 - 0.006;
      bag.box("alu", V(x, sy * c, sz * c), V(0.05, MOD.CHAMF * 1.414, 0.036), undefined, q);
    }
  }
  endCone(bag, -1); endCone(bag, 1);
  // 6 ceiling LED light panels on the overhead chamfers, plus 2 status-LED strips
  for (const sz of [-1, 1]) for (const x of [-2.65, -0.55, 1.55]) {
    const q = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), sz > 0 ? -Math.PI / 4 : Math.PI / 4);
    const c = MOD.HALF - MOD.CHAMF / 2 - 0.028;
    bag.box("aluDark", V(x, c + 0.004, sz * (c + 0.004)), V(0.98, 0.22, 0.02), undefined, q);
    bag.box("light", V(x, c - 0.004, sz * (c - 0.004)), V(0.9, 0.17, 0.006), undefined, q);
  }
  bag.box("ledBlue", V(-0.6, -MOD.HALF + 0.08, -FACE - 0.02), V(2.4, 0.008, 0.008));
  bag.box("ledGreen", V(1.2, MOD.HALF - 0.08, FACE + 0.02), V(1.6, 0.008, 0.008));
  return { meshes: bag.merged(), fasteners: fast, knobs, jacks };
}

export function InstancedParts({ geo, mat, list, castShadow = false }: { geo: THREE.BufferGeometry; mat: THREE.Material; list: THREE.Matrix4[]; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    list.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere();
  }, [list]);
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} castShadow={castShadow} receiveShadow frustumCulled={false} />;
}

export function Module() {
  const mats = getMats();
  const data = useMemo(() => buildModule(), []);
  const parts = useMemo(() => ({
    fast: new THREE.CylinderGeometry(0.0065, 0.0065, 0.006, 8).translate(0, 0.003, 0),
    knob: new THREE.CylinderGeometry(0.008, 0.008, 0.022, 8).translate(0, 0.011, 0),
    jack: new THREE.CylinderGeometry(0.014, 0.016, 0.02, 12).translate(0, 0.01, 0),
  }), []);
  return (
    <group name="module">
      {data.meshes.map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} receiveShadow castShadow={k === "alu"} />)}
      <InstancedParts geo={parts.fast} mat={mats.alu} list={data.fasteners} />
      <InstancedParts geo={parts.knob} mat={mats.alu} list={data.knobs} />
      <InstancedParts geo={parts.jack} mat={mats.aluDark} list={data.jacks} />
    </group>
  );
}
