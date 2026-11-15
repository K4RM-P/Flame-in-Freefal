// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Procedural textures (no downloaded assets): rack label atlas, panel normal, brushed-metal roughness, screens.
// Generic text only: no agency names, logos, flags or patches.
import * as THREE from "three";

/** Deterministic PRNG (mulberry32) seeded from a string, so a scenario always looks the same. */
export function rng(seed: string | number) {
  let h = typeof seed === "number" ? seed >>> 0 : 2166136261;
  if (typeof seed === "string") for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => { h = (h + 0x6d2b79f5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const ATLAS_COLS = 8, ATLAS_ROWS = 8;
export type LabelKind = "id" | "caution" | "barcode" | "text" | "warn";
export const LABEL_KINDS: LabelKind[] = ["id", "caution", "barcode", "text", "warn"];

/** 8×8 atlas of 256×64 px label tiles; tile index → UV rectangle via atlasUV. */
export function labelAtlas(): THREE.CanvasTexture {
  const W = 256, H = 64;
  const c = document.createElement("canvas"); c.width = W * ATLAS_COLS; c.height = H * ATLAS_ROWS;
  const g = c.getContext("2d")!;
  const r = rng("labels");
  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const x = (i % ATLAS_COLS) * W, y = Math.floor(i / ATLAS_COLS) * H;
    const kind = LABEL_KINDS[i % LABEL_KINDS.length];
    g.save(); g.translate(x, y);
    if (kind === "id") {
      g.fillStyle = "#f1efe8"; g.fillRect(0, 0, W, H); g.fillStyle = "#16181c"; g.font = "bold 30px monospace";
      const wall = "OSPD"[Math.floor(i / 5) % 4];
      g.fillText(`RACK ${wall}${1 + (i % 2)}-0${1 + (i % 4)}`, 12, 42); g.strokeStyle = "#16181c"; g.lineWidth = 3; g.strokeRect(3, 3, W - 6, H - 6);
    } else if (kind === "caution") {
      g.fillStyle = "#e9b616"; g.fillRect(0, 0, W, H); g.fillStyle = "#121212";
      for (let k = -2; k < 12; k++) { g.beginPath(); g.moveTo(k * 26, H); g.lineTo(k * 26 + 13, H); g.lineTo(k * 26 + 13 + 18, 0); g.lineTo(k * 26 + 18, 0); g.fill(); }
      g.fillStyle = "#e9b616"; g.fillRect(40, 14, W - 80, H - 28); g.fillStyle = "#121212"; g.font = "bold 26px sans-serif"; g.fillText("CAUTION", 72, 42);
    } else if (kind === "barcode") {
      g.fillStyle = "#f4f3ee"; g.fillRect(0, 0, W, H); g.fillStyle = "#111";
      let px = 10; while (px < W - 10) { const w = 1 + Math.floor(r() * 4); if (r() > 0.4) g.fillRect(px, 6, w, H - 22); px += w + 1 + Math.floor(r() * 2); }
      g.font = "11px monospace"; g.fillText(`${Math.floor(r() * 1e9)}`.padStart(9, "0"), 12, H - 4);
    } else if (kind === "warn") {
      g.fillStyle = "#c9361f"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = "bold 22px sans-serif"; g.fillText(i % 2 ? "FIRE EXTINGUISHER" : "BREATHING APPARATUS", 10, 40);
    } else {
      g.fillStyle = "#dcdad3"; g.fillRect(0, 0, W, H); g.fillStyle = "#4a4d52";
      for (let l = 0; l < 5; l++) g.fillRect(10, 8 + l * 10, 60 + r() * 170, 5);
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}
export function atlasUV(i: number): [number, number, number, number] {
  const cx = i % ATLAS_COLS, cy = Math.floor(i / ATLAS_COLS) % ATLAS_ROWS;
  return [cx / ATLAS_COLS, 1 - (cy + 1) / ATLAS_ROWS, (cx + 1) / ATLAS_COLS, 1 - cy / ATLAS_ROWS];
}
/** First atlas tile of a given kind with offset k. */
export function tileOf(kind: LabelKind, k = 0) { const n = LABEL_KINDS.indexOf(kind); return (n + LABEL_KINDS.length * (k % 12)) % (ATLAS_COLS * ATLAS_ROWS); }

function valueNoise(w: number, h: number, sx: number, sy: number, seed: string) {
  const r = rng(seed); const gw = Math.ceil(w / sx) + 2, gh = Math.ceil(h / sy) + 2;
  const grid = Array.from({ length: gw * gh }, () => r());
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = x / sx, fy = y / sy, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const a = grid[iy * gw + ix], b = grid[iy * gw + ix + 1], c = grid[(iy + 1) * gw + ix], d = grid[(iy + 1) * gw + ix + 1];
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    out[y * w + x] = a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }
  return out;
}

/** Subtle panel-texture normal map (powder-coat orange-peel). */
export function panelNormal(): THREE.DataTexture {
  const S = 128, n = valueNoise(S, S, 4, 4, "panel"), d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, dx = n[y * S + ((x + 1) % S)] - n[i], dy = n[((y + 1) % S) * S + x] - n[i];
    d[i * 4] = 128 + dx * 90; d[i * 4 + 1] = 128 + dy * 90; d[i * 4 + 2] = 255; d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.needsUpdate = true; return t;
}

/** Stretched-noise roughness for an anisotropic brushed-aluminium look. */
export function brushedRoughness(): THREE.DataTexture {
  const W = 256, H = 64, n = valueNoise(W, H, 64, 1, "brushed"), d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { const v = 70 + n[i] * 70; d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, W, H); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 8); t.needsUpdate = true; return t;
}

/** Soft-goods (stowage bag) normal: coarser, fabric-like. */
export function fabricNormal(): THREE.DataTexture {
  const S = 64, n = valueNoise(S, S, 2, 6, "fabric"), d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, dx = n[y * S + ((x + 1) % S)] - n[i], dy = n[((y + 1) % S) * S + x] - n[i];
    d[i * 4] = 128 + dx * 160; d[i * 4 + 1] = 128 + dy * 160; d[i * 4 + 2] = 255; d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.needsUpdate = true; return t;
}

/** Static generic equipment screen (blocks and bars; no real UI or logos). */
export function genericScreen(seed: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 256; c.height = 160; const g = c.getContext("2d")!; const r = rng(seed);
  g.fillStyle = "#06121c"; g.fillRect(0, 0, 256, 160);
  g.fillStyle = "#1d6f8f"; g.fillRect(0, 0, 256, 18);
  for (let i = 0; i < 7; i++) { g.fillStyle = r() > 0.8 ? "#4fd18b" : "#7fa7bd"; g.fillRect(12, 28 + i * 17, 40 + r() * 150, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Dim glow behind the hatch window (the next module; no Earth view). */
export function hatchGlow(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 54, 4, 64, 64, 64); gr.addColorStop(0, "#c9d6e3"); gr.addColorStop(0.5, "#5b6a7a"); gr.addColorStop(1, "#11161c");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
