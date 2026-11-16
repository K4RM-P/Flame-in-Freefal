// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION = "Describe a spacecraft cabin, burn it with a physics engine calibrated on NASA fire experiments, ask Aster why, and fix it before launch. NASA Space Apps 2026 · Flame in Freefall.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "EmberAtlas — The firefighter for space", template: "%s · EmberAtlas" },
  description: DESCRIPTION,
  applicationName: "EmberAtlas",
  openGraph: { title: "EmberAtlas — The firefighter for space", description: DESCRIPTION, type: "website", siteName: "EmberAtlas", url: "/" },
  twitter: { card: "summary_large_image", title: "EmberAtlas — The firefighter for space", description: DESCRIPTION },
};

// Dark-first: only an explicit saved "light" choice switches the theme.
const themeBootstrap = `(() => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem("ea.theme")); } catch {}
  document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
