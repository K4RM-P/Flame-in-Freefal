// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Shared PBR materials and a geometry "bag" that merges static meshes per material (one draw call each).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { brushedRoughness, fabricNormal, genericScreen, hatchGlow, labelAtlas, panelNormal } from "./textures";

const std = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

function build() {
  const pn = panelNormal(), br = brushedRoughness(), fab = fabricNormal();
  return {
    panel: std("#dcd9cf", 0.55, 0, { normalMap: pn, normalScale: new THREE.Vector2(0.18, 0.18) }),
    panelAlt: std("#cfcbc0", 0.6, 0, { normalMap: pn, normalScale: new THREE.Vector2(0.18, 0.18) }),
    dark: std("#1e2125", 0.75),
    alu: std("#bcc0c6", 0.35, 0.9, { roughnessMap: br }),
    aluDark: std("#70747c", 0.45, 0.75, { roughnessMap: br }),
    label: std("#ffffff", 0.6, 0, { map: labelAtlas() }),
    screen: std("#000000", 0.25, 0, { emissive: new THREE.Color("#ffffff"), emissiveMap: genericScreen("rack"), emissiveIntensity: 1.3 }),
    light: glow(2.2, 2.0, 1.75),           // 4500 K-ish warm white, > 1 so bloom picks it up
    ledBlue: glow(0.35, 1.2, 3.2), ledGreen: glow(0.4, 3, 1.2),
    hatchGlow: new THREE.MeshBasicMaterial({ map: hatchGlow(), color: new THREE.Color(0.9, 0.9, 0.95), toneMapped: false }),
    yellow: std("#d8a520", 0.4, 0.35), railGrey: std("#8e9299", 0.4, 0.55),
    cableBlack: std("#141518", 0.8), cableGrey: std("#5c6067", 0.75), cableWhite: std("#e4e2db", 0.7), cableOrange: std("#d2611d", 0.65), cableBlue: std("#2b62b2", 0.65),
    hose: std("#a3a7ac", 0.5, 0.25), duct: std("#c8c6bf", 0.6, 0.1),
    bagWhite: std("#e7e2d4", 0.92, 0, { normalMap: fab, normalScale: new THREE.Vector2(0.5, 0.5) }),
    bagBeige: std("#c9b48c", 0.92, 0, { normalMap: fab, normalScale: new THREE.Vector2(0.5, 0.5) }),
    velcro: std("#2a2b2e", 1), bungee: std("#2b3166", 0.7),
    red: std("#b3261e", 0.45, 0.1), plastic: std("#1b1c1f", 0.5), skinless: std("#b9b4ab", 0.6),
    crewShirt: std("#1f2c4d", 0.85), crewPants: std("#9b8a66", 0.85), crewHead: std("#c9bfb2", 0.55),
  };
}
export type Mats = ReturnType<typeof build>;
export type MatKey = keyof Mats;
let cache: Mats | null = null;
/** Lazily built on the client, inside the Canvas (textures use document). */
export function getMats(): Mats { return (cache ??= build()); }

/** Collects geometries per material; `merged()` returns one BufferGeometry per material. */
export class GeoBag {
  private m = new Map<MatKey, THREE.BufferGeometry[]>();
  add(k: MatKey, g: THREE.BufferGeometry) { (this.m.get(k) ?? this.m.set(k, []).get(k)!).push(g); return this; }
  box(k: MatKey, p: THREE.Vector3Like, s: THREE.Vector3Like, m?: THREE.Matrix4, q?: THREE.Quaternion) {
    const g = new THREE.BoxGeometry(s.x, s.y, s.z);
    if (q) g.applyQuaternion(q);
    g.translate(p.x, p.y, p.z); if (m) g.applyMatrix4(m); return this.add(k, g);
  }
  merged(): [MatKey, THREE.BufferGeometry][] {
    const out: [MatKey, THREE.BufferGeometry][] = [];
    for (const [k, gs] of this.m) {
      const norm = gs.map((g) => { for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a); return g.index ? g : g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i)); });
      const mg = mergeGeometries(norm, false); if (mg) { mg.computeBoundingSphere(); out.push([k, mg]); }
      gs.forEach((g) => g.dispose());
    }
    return out;
  }
}

/** Instance matrices builder: position + orientation (unit axis the part's +Y should point along) + scale. */
export function inst(list: THREE.Matrix4[], p: THREE.Vector3, axis: THREE.Vector3, s = 1, sy = s) {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
  list.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, sy, s)));
}
