"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Nav: Simulator · Evidence · Methods (logo → landing), theme toggle; About lives in the footer.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useMission, lsGet, lsSet } from "@/lib/store";

const NAV = [["/simulator", "Simulator"], ["/evidence", "Evidence"], ["/methods", "Methods"], ["/about", "About"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const theme = useMission((s) => s.theme);
  const set = useMission((s) => s.set);
  const path = usePathname().replace(/(.)\/$/, "$1");
  useEffect(() => { set({ theme: lsGet<"dark" | "light">("ea.theme", "dark") }); }, [set]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
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
        <button type="button" className="btn ml-auto" onClick={() => { const t = theme === "dark" ? "light" : "dark"; set({ theme: t }); lsSet("ea.theme", t); }} aria-label="Toggle theme">
          {theme === "dark" ? "Ivory" : "Dark"}
        </button>
      </header>
      <main key={path} className={`page-fade mx-auto min-w-0 ${path === "/" ? "max-w-none p-0" : "max-w-[1600px] px-4 py-4 md:px-6"}`}>{children}</main>
      <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-3 text-[12px] text-faint md:px-6" data-noprint>
        Built on NASA PSI Data Repository: Combustion Science. Partial gravity is a bounded estimate (µg ↔ 1 g). Not for flight certification.
        {" · "}<Link className="underline underline-offset-2" href="/about">About EmberAtlas</Link>
      </footer>
    </>
  );
}
