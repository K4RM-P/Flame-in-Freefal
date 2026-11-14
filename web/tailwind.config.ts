import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)", panel: "rgb(var(--panel) / <alpha-value>)", line: "rgb(var(--line) / <alpha-value>)", ink: "rgb(var(--ink) / <alpha-value>)", mute: "rgb(var(--mute) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)", ok: "rgb(var(--ok) / <alpha-value>)", bad: "rgb(var(--bad) / <alpha-value>)", warn: "rgb(var(--warn) / <alpha-value>)", blue: "rgb(var(--blue) / <alpha-value>)",
      },
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], mono: ["var(--font-mono)", "ui-monospace", "monospace"] },
    },
  },
  plugins: [],
} satisfies Config;
