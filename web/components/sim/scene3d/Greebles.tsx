"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Hardware clutter that makes the module read as real: cable looms with sag and zip ties, corrugated hoses, air
// ducts, handrails on standoffs, bungees holding stowage bags, velcro, laptops on arms, a clipboard and the
// portable fire extinguisher + breathing apparatus. Deterministic per scenario name. Purely visual: no engine data.
import { useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as THREE from "three";
import { GeoBag, getMats, inst, type MatKey } from "./materials";
import { ANCHORS, InstancedParts, MOD, WALLS, wallNormal, wallPoint, type Wall } from "./Module";
import { atlasUV, rng, tileOf } from "./textures";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CABLES: MatKey[] = ["cableBlack", "cableBlack", "cableGrey", "cableGrey", "cableWhite", "cableBlack", "cableOrange", "cableBlue", "cableWhite", "cableGrey"];
const CORNERS: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const FACE = MOD.HALF - MOD.CHAMF;

function labelPlane(bag: GeoBag, w: number, h: number, tile: number, pos: THREE.Vector3, q: THREE.Quaternion) {
  const g = new THREE.PlaneGeometry(w, h); const [u0, v0, u1, v1] = atlasUV(tile); const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  g.applyQuaternion(q); g.translate(pos.x, pos.y, pos.z); bag.add("label", g);
}
const faceQ = (w: Wall) => new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), wallNormal(w));

export function buildGreebles(seed: string) {
  const r = rng(`cables:${seed}`);
  const bag = new GeoBag(), ties: THREE.Matrix4[] = [], ribs: THREE.Matrix4[] = [], standoffs: THREE.Matrix4[] = [];
  let strands = 0;
  // ---- cable looms along the chamfered corners, some dropping from rack connector panels
  const slots = new Map<string, number>();
  for (let L = 0; L < 11; L++) {
    const [sy, sz] = CORNERS[L % 4];
    const slot = slots.get(`${sy}${sz}`) ?? 0; slots.set(`${sy}${sz}`, slot + 1);
    const c = MOD.HALF - MOD.CHAMF / 2, inward = V(0, -sy, -sz).normalize().multiplyScalar(0.035 + slot * 0.012);
    const tang = V(0, sy, -sz).normalize().multiplyScalar((slot - 1) * 0.07);
    const base = V(0, sy * c, sz * c).add(inward).add(tang);
    const xa = MOD.X0 + 0.2 + r() * 3.2, xb = Math.min(MOD.X1 - 0.15, xa + 2 + r() * 3.5);
    const nCtl = 6 + Math.floor(r() * 5), pts: THREE.Vector3[] = [];
    const fromRack = r() > 0.45;
    if (fromRack) { // start at a connector panel on an adjacent rack face, then sweep into the corner
      const w: Wall = sy > 0 ? "overhead" : "deck";
      pts.push(wallPoint(w, xa - 0.25, sz * (FACE - 0.25), 0.04), wallPoint(w, xa - 0.1, sz * (FACE - 0.08), 0.06));
    }
    for (let k = 0; k < nCtl; k++) {
      const u = k / (nCtl - 1), x = xa + (xb - xa) * u;
      const sag = k % 2 ? 0.018 + r() * 0.05 : 0; // clamp points hug the channel; spans between them sag into the aisle
      pts.push(base.clone().setX(x).add(V(0, -sy, -sz).normalize().multiplyScalar(sag)).add(V(0, (r() - 0.5) * 0.012, (r() - 0.5) * 0.012)));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    const len = curve.getLength();
    const n = 3 + Math.floor(r() * 5), loomR = 0.012 + n * 0.004;
    const frames = curve.computeFrenetFrames(Math.max(8, Math.ceil(len * 12)), false);
    for (let s = 0; s < n; s++) {
      const a = (s / n) * Math.PI * 2 + r(), rad = s === 0 ? 0 : loomR * (0.45 + 0.45 * r());
      const sp = curve.getSpacedPoints(Math.max(8, Math.ceil(len * 12))).map((p, i) => p.clone().add(frames.normals[i].clone().multiplyScalar(Math.cos(a) * rad)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a) * rad)));
      const sc = new THREE.CatmullRomCurve3(sp);
      bag.add(CABLES[Math.floor(r() * CABLES.length)], new THREE.TubeGeometry(sc, Math.ceil(len * 22), 0.004 + r() * 0.01, 6, false));
      strands++;
    }
    for (let d = 0.2; d < len; d += 0.3 + r() * 0.2) { const u = d / len; inst(ties, curve.getPointAt(u), curve.getTangentAt(u), loomR + 0.008); }
  }
  // ---- single runs between racks (connector panel → corner)
  for (let k = 0; k < 6; k++) {
    const w = WALLS[k % 4], u0 = -2 + r() * 4, v0 = (r() - 0.5) * 1.2, sgn = r() > 0.5 ? 1 : -1;
    const p0 = wallPoint(w, u0, v0, 0.04), p3 = wallPoint(w, u0 + 0.6, sgn * (FACE + 0.05), 0.05);
    const mid = p0.clone().lerp(p3, 0.5).add(wallNormal(w).multiplyScalar(0.09));
    const cv = new THREE.CatmullRomCurve3([p0, p0.clone().add(wallNormal(w).multiplyScalar(0.05)), mid, p3]);
    bag.add(CABLES[(k * 3) % CABLES.length], new THREE.TubeGeometry(cv, 32, 0.005 + r() * 0.006, 6, false)); strands++;
  }
  // ---- 6 corrugated hoses (ribs = alternating torus instances on a smooth inner tube)
  for (let h = 0; h < 6; h++) {
    const w = WALLS[(h + 1) % 4], u0 = MOD.X0 + 0.6 + h * 1.2 + r() * 0.4;
    const pts = [wallPoint(w, u0, -0.5 + r() * 0.3, 0.05), wallPoint(w, u0 + 0.2, -0.1, 0.14 + r() * 0.06), wallPoint(w, u0 + 0.55, 0.3, 0.12), wallPoint(w, u0 + 0.75, FACE - 0.05, 0.06)];
    const cv = new THREE.CatmullRomCurve3(pts), len = cv.getLength(), R = 0.018 + r() * 0.01;
    bag.add("hose", new THREE.TubeGeometry(cv, 40, R * 0.85, 10, false));
    for (let d = 0; d < len; d += 0.018) { const u = d / len; inst(ribs, cv.getPointAt(u), cv.getTangentAt(u), R); }
  }
  // ---- 2 rectangular air ducts with diffuser grilles (overhead, along the module)
  for (const sz of [-1, 1]) {
    const z = sz * (FACE - 0.18), y = MOD.HALF - 0.075;
    bag.box("duct", V(-0.4, y, z), V(6.6, 0.11, 0.26));
    for (let k = 0; k < 4; k++) {
      const x = -3.2 + k * 1.75 + (sz > 0 ? 0.6 : 0);
      bag.box("dark", V(x, y - 0.056, z), V(0.36, 0.004, 0.2));
      for (let s = 0; s < 7; s++) bag.box("aluDark", V(x - 0.15 + s * 0.05, y - 0.062, z), V(0.012, 0.01, 0.19));
    }
  }
  // ---- 24+ handrails on standoffs (yellow anodized and grey)
  let rails = 0;
  for (const w of WALLS) for (let k = 0; k < 7; k++) {
    const u0 = MOD.X0 + 0.45 + k * 1.15 + r() * 0.2, len = 0.55 + r() * 0.35, v = (k % 2 ? 1 : -1) * (0.35 + r() * 0.35);
    if (w === "port" && u0 > ANCHORS.sample.x - 0.3 && u0 < ANCHORS.sample.x + 1.4) continue; // keep the holder struts clear
    const pts = [wallPoint(w, u0, v, 0.012), wallPoint(w, u0 + 0.04, v, 0.065), wallPoint(w, u0 + len - 0.04, v, 0.065), wallPoint(w, u0 + len, v, 0.012)];
    const cv = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
    bag.add(rails % 3 === 2 ? "railGrey" : "yellow", new THREE.TubeGeometry(cv, 24, 0.0125, 8, false));
    for (const uu of [u0 + 0.02, u0 + len - 0.02]) inst(standoffs, wallPoint(w, uu, v, 0), wallNormal(w), 1);
    rails++;
  }
  // ---- bungees across 3 rack faces, holding stowage bags; velcro squares
  const stow: [Wall, number][] = [["port", -1.6], ["starboard", 0.5], ["overhead", -2.6]];
  let bags = 0;
  for (const [w, uc] of stow) {
    const q = faceQ(w);
    for (const v of [-0.35, 0.05, 0.42]) {
      const p0 = wallPoint(w, uc - 0.5, v, 0.03), p1 = wallPoint(w, uc + 0.5, v, 0.03), m = p0.clone().lerp(p1, 0.5).add(wallNormal(w).multiplyScalar(0.14));
      bag.add("bungee", new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, m, p1), 24, 0.004, 5, false));
      for (const p of [p0, p1]) bag.box("aluDark", p, V(0.02, 0.02, 0.02));
    }
    for (let b = 0; b < 3 + (bags < 8 ? 1 : 0); b++) {
      const bw = 0.22 + r() * 0.12, bh = 0.18 + r() * 0.14, bd = 0.1 + r() * 0.08;
      const g = new RoundedBoxGeometry(bw, bh, bd, 3, 0.025);
      const p = wallPoint(w, uc - 0.36 + b * 0.25, -0.15 + (b % 2) * 0.32, bd / 2 + 0.03);
      g.applyQuaternion(q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), (r() - 0.5) * 0.25))); g.translate(p.x, p.y, p.z);
      bag.add(r() > 0.45 ? "bagWhite" : "bagBeige", g); bags++;
      labelPlane(bag, 0.1, 0.03, tileOf("barcode", b + bags), wallPoint(w, uc - 0.36 + b * 0.25, -0.15 + (b % 2) * 0.32 - bh * 0.25, bd + 0.032), q);
    }
  }
  for (let k = 0; k < 34; k++) {
    const w = WALLS[k % 4], p = wallPoint(w, MOD.X0 + 0.4 + r() * (MOD.LEN - 0.8), (r() - 0.5) * 1.5, 0.036);
    const g = new THREE.BoxGeometry(0.05, 0.05, 0.003); g.applyQuaternion(faceQ(w)); g.translate(p.x, p.y, p.z); bag.add("velcro", g);
  }
  // ---- laptops on articulating arms (the first one's screen is the live engine readout drawn by Systems)
  const laptop = (screen: THREE.Vector3, yaw: number, w: Wall, live: boolean) => {
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw);
    const n = V(0, 0, 1).applyQuaternion(q);
    const lid = new THREE.BoxGeometry(0.33, 0.21, 0.008); lid.applyQuaternion(q); const lp = screen.clone().addScaledVector(n, -0.006); lid.translate(lp.x, lp.y, lp.z); bag.add("plastic", lid);
    if (!live) { const s = new THREE.PlaneGeometry(0.3, 0.19); s.applyQuaternion(q); s.translate(screen.x + n.x * 0.0005, screen.y, screen.z + n.z * 0.0005); bag.add("screen", s); }
    const kb = new THREE.BoxGeometry(0.33, 0.016, 0.23); kb.applyQuaternion(q); const kp = screen.clone().add(V(0, -0.105, 0)).addScaledVector(n, 0.11); kb.translate(kp.x, kp.y, kp.z); bag.add("plastic", kb);
    const mount = wallPoint(w, screen.x + 0.05, -0.25, 0.02), elbow = mount.clone().lerp(kp, 0.5).add(V(0, -0.12, 0));
    for (const [a, b] of [[mount, elbow], [elbow, kp.clone().add(V(0, -0.02, 0))]] as const) {
      const d = b.clone().sub(a), g = new THREE.CylinderGeometry(0.012, 0.012, d.length(), 10);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize())); const m = a.clone().lerp(b, 0.5); g.translate(m.x, m.y, m.z); bag.add("aluDark", g);
    }
    for (const p of [mount, elbow]) { const s = new THREE.SphereGeometry(0.02, 10, 8); s.translate(p.x, p.y, p.z); bag.add("alu", s); }
  };
  laptop(ANCHORS.laptopScreen, Math.PI + 0.35, "starboard", true);
  laptop(V(2.7, 0.2, -MOD.HALF + 0.42), -0.3, "port", false);
  // ---- clipboard
  { const q = faceQ("port"), p = wallPoint("port", -0.6, 0.25, 0.04); const g = new THREE.BoxGeometry(0.23, 0.32, 0.004); g.applyQuaternion(q); g.translate(p.x, p.y, p.z); bag.add("panelAlt", g);
    const c = new THREE.BoxGeometry(0.09, 0.025, 0.012); c.applyQuaternion(q); c.translate(p.x, p.y + 0.15, p.z + 0.004); bag.add("alu", c);
    labelPlane(bag, 0.19, 0.26, tileOf("text", 4), p.clone().add(V(0, -0.01, 0.0035)), q); }
  // ---- portable fire extinguisher (PFE) + portable breathing apparatus (PBA) at a rack face
  { const w: Wall = "starboard", q = faceQ(w), base = wallPoint(w, -2.25, 0.1, 0.1);
    const cyl = new THREE.CylinderGeometry(0.065, 0.065, 0.46, 20); cyl.translate(base.x, base.y, base.z); bag.add("red", cyl);
    const top = new THREE.CylinderGeometry(0.03, 0.05, 0.08, 14); top.translate(base.x, base.y + 0.27, base.z); bag.add("plastic", top);
    const noz = new THREE.CylinderGeometry(0.012, 0.018, 0.16, 8); noz.rotateZ(Math.PI / 2); noz.translate(base.x + 0.08, base.y + 0.3, base.z); bag.add("plastic", noz);
    for (const dy of [-0.13, 0.13]) { const s = new THREE.TorusGeometry(0.07, 0.008, 6, 20); s.rotateX(Math.PI / 2); s.translate(base.x, base.y + dy, base.z); bag.add("aluDark", s); }
    labelPlane(bag, 0.11, 0.05, tileOf("warn", 1), base.clone().add(V(0, 0.02, -0.066)), q);
    const pba = wallPoint(w, -1.8, 0.05, 0.08); const box = new RoundedBoxGeometry(0.3, 0.24, 0.14, 2, 0.02); box.translate(pba.x, pba.y, pba.z); bag.add("plastic", box);
    labelPlane(bag, 0.22, 0.055, tileOf("warn", 0), pba.clone().add(V(0, 0.05, -0.071)), q); }

  return { meshes: bag.merged(), ties, ribs, standoffs, counts: { strands, rails, bags } };
}

export function Greebles({ seed }: { seed: string }) {
  const mats = getMats();
  const data = useMemo(() => buildGreebles(seed), [seed]);
  const parts = useMemo(() => ({
    tie: new THREE.TorusGeometry(1, 0.14, 4, 12).rotateX(Math.PI / 2),
    rib: new THREE.TorusGeometry(1, 0.2, 4, 10).rotateX(Math.PI / 2),
    standoff: new THREE.CylinderGeometry(0.016, 0.02, 0.05, 10).translate(0, 0.025, 0),
  }), []);
  return (
    <group name="greebles">
      {data.meshes.map(([k, g]) => <mesh key={k} geometry={g} material={mats[k]} castShadow={k.startsWith("cable") || k === "hose"} receiveShadow />)}
      <InstancedParts geo={parts.tie} mat={mats.cableBlack} list={data.ties} />
      <InstancedParts geo={parts.rib} mat={mats.hose} list={data.ribs} />
      <InstancedParts geo={parts.standoff} mat={mats.aluDark} list={data.standoffs} />
    </group>
  );
}
