"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Nav: Simulator · Evidence · Methods (logo → landing), theme toggle; About lives in the footer.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Aster } from "@/components/Aster";
import { useMission, lsGet, lsSet } from "@/lib/store";

const NAV = [["/simulator", "Simulator"], ["/evidence", "Evidence"], ["/methods", "Methods"], ["/about", "About"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const set = useMission((s) => s.set);
  const path = usePathname().replace(/(.)\/$/, "$1");
  const [preference, setPreference] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    const saved = lsGet<unknown>("ea.theme", "system");
    setPreference(saved === "light" || saved === "dark" ? saved : "system");
    set({ theme: document.documentElement.dataset.theme === "light" ? "light" : "dark" });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function followSystem() {
      const choice = lsGet<unknown>("ea.theme", "system");
      if (choice === "dark" || choice === "light") return;
      const theme = media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      set({ theme });
    }
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, [set]);

  function chooseTheme(choice: typeof preference) {
    const theme = choice === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : choice;
    document.documentElement.dataset.theme = theme;
    set({ theme });
    setPreference(choice);
    lsSet("ea.theme", choice);
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
        <select className="ml-auto theme-toggle" aria-label="Theme" value={preference}
          onChange={(event) => chooseTheme(event.target.value as typeof preference)}>
          <option value="system">System</option>
          <option value="light">Ivory</option>
          <option value="dark">Dark</option>
        </select>
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
