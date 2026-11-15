"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Nav: Simulator · Evidence · Methods (logo → landing), theme toggle; About lives in the footer.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Aster } from "@/components/Aster";
import { useMission, lsSet } from "@/lib/store";

const NAV = [["/simulator", "Simulator"], ["/evidence", "Evidence"], ["/methods", "Methods"], ["/about", "About"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const set = useMission((s) => s.set);
  const path = usePathname().replace(/(.)\/$/, "$1");
  useEffect(() => {
    set({ theme: document.documentElement.dataset.theme === "light" ? "light" : "dark" });
  }, [set]);

  function toggleTheme() {
    const root = document.documentElement;
    const theme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = theme;
    set({ theme });
    lsSet("ea.theme", theme);
  }
  return (
    <>
      <header className="shell-header sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-line bg-bg px-4">
        <Link href="/" className="display shrink-0 text-[16px]">EmberAtlas</Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
              className={`px-2 py-1 text-[14px] ${path === href ? "bg-surface2 text-ink" : "text-mute hover:text-ink"}`} style={{ borderRadius: 6 }}>{label}</Link>
          ))}
        </nav>
        <button type="button" className="btn theme-toggle ml-auto" onClick={toggleTheme} aria-label="Toggle theme">
          <span className="theme-toggle__ivory">Ivory</span><span className="theme-toggle__dark">Dark</span>
        </button>
      </header>
      <main key={path} className={`page-fade mx-auto min-w-0 ${path === "/" ? "max-w-none p-0" : "max-w-[1600px] px-4 py-4 md:px-6"}`}>{children}</main>
      <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-3 text-[12px] text-faint md:px-6" data-noprint>
        Built on NASA PSI Data Repository: Combustion Science. Partial gravity is a bounded estimate (µg ↔ 1 g). Not for flight certification.
        {" · "}<Link className="underline underline-offset-2" href="/about">About EmberAtlas</Link>
      </footer>
      <Aster />
    </>
  );
}
