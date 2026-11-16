// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Open Graph / Twitter card: text-only, generated at build time (no stock or AI imagery).
import { ImageResponse } from "next/og";

export const alt = "EmberAtlas — The firefighter for space";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0A0A0A", color: "#EDEDED", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: "#A1A1A1" }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: "#FF6B35" }} />EmberAtlas
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>The firefighter for space.</div>
        <div style={{ fontSize: 34, color: "#A1A1A1", maxWidth: 980 }}>Describe a cabin · burn it with NASA ISS fire data · ask Aster why · fix it before launch.</div>
      </div>
      <div style={{ fontSize: 24, color: "#737373" }}>NASA Space Apps 2026 · Flame in Freefall · Team EmberAtlas, Toronto</div>
    </div>,
    size,
  );
}
