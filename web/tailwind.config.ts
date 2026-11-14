// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"), panel: c("panel"), surface2: c("surface2"), line: c("line"), ink: c("ink"), mute: c("mute"), faint: c("faint"),
        accent: c("accent"), ok: c("ok"), bad: c("bad"), warn: c("warn"), blue: c("blue"), theory: c("theory"),
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "ui-monospace", "monospace"], serif: ["var(--font-serif)", "Georgia", "serif"] },
      fontSize: { "2xs": "12px", xs: "13px", sm: "14px", base: "16px", lg: "20px", xl: "24px", "2xl": "32px", "3xl": "48px", "4xl": "64px" },
    },
  },
  plugins: [],
} satisfies Config;
