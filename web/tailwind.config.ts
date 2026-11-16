// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // EmberAtlas tokens (legacy names kept)
        bg: c("bg"), panel: c("panel"), surface2: c("surface2"), line: c("line"), ink: c("ink"), mute: c("mute"), faint: c("faint"),
        ember: { DEFAULT: c("ember"), text: c("accent-text") }, ok: c("ok"), bad: c("bad"), warn: c("warn"), blue: c("blue"), theory: c("theory"),
        // shadcn semantic colours
        background: c("background"), foreground: c("foreground"), border: c("border"), input: c("input"), ring: c("ring"),
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        secondary: { DEFAULT: c("secondary"), foreground: c("secondary-foreground") },
        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },
        accent: { DEFAULT: c("accent-surface"), foreground: c("accent-foreground") },
        destructive: { DEFAULT: c("destructive"), foreground: c("destructive-foreground") },
        popover: { DEFAULT: c("popover"), foreground: c("popover-foreground") },
        card: { DEFAULT: c("card"), foreground: c("card-foreground") },
      },
      borderRadius: { lg: "12px", md: "6px", sm: "4px" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "ui-monospace", "monospace"] },
      fontSize: { "2xs": "12px", xs: "13px", sm: "14px", base: "16px", lg: "20px", xl: "24px", "2xl": "32px", "3xl": "48px", "4xl": "64px" },
      letterSpacing: { display: "-0.04em", label: "0.08em" },
      transitionTimingFunction: { out: "cubic-bezier(.16,1,.3,1)" },
      keyframes: { marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } } },
      animation: { marquee: "marquee 60s linear infinite" },
    },
  },
  plugins: [],
} satisfies Config;
