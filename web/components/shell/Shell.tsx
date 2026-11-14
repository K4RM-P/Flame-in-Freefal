"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { readUrl, toUrl, useMission, lsGet, lsSet, snapshot } from "@/lib/store";
import { spring } from "@/lib/ui/motion";
import { MISSIONS } from "@/lib/missions";
import { MATERIALS } from "@/lib/ui/materials";
import { GOLDEN_QUESTIONS } from "@/lib/ai/questions";
import { CopyButton } from "@/components/ui-kit";
import { AskPanel } from "@/components/AskPanel";
import { MissionPill } from "./MissionPill";
import { Receipt } from "./Receipt";

const NAV = [["/review", "Review", "r"], ["/evidence", "Evidence Library", "e"], ["/methods", "Methods & Validation", "m"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useMission();
  const path = usePathname();
  const router = useRouter();
  const hydrated = useRef(false);
  const bare = path === "/" || path === "/start";
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const u = readUrl(window.location.search);
    const saved = lsGet<Record<string, unknown>>("ea.mission", {});
    const theme = lsGet<"dark" | "light">("ea.theme", "dark");
    useMission.setState({ ...(Object.keys(u).length ? {} : saved), ...u, theme } as never);
    if (u.preset && u.x_o2 == null) useMission.getState().applyPreset(String(u.preset));
    if (u.present) useMission.setState({ railOpen: false });
    hydrated.current = true;
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.dataset.present = s.present ? "1" : "0";
    if (!hydrated.current || bare) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${toUrl(s)}`);
    lsSet("ea.mission", { preset: s.preset, x_o2: s.x_o2, P_kPa: s.P_kPa, gravity_g: s.gravity_g, flow_cm_s: s.flow_cm_s, V_m3: s.V_m3, material: s.material, role: s.role });
  }, [s, bare]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); useMission.setState({ palette: !useMission.getState().palette }); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") useMission.setState({ drawer: null, palette: false });
      else if (e.key === "?") setHelp((h) => !h);
      else if (e.key === "/") { e.preventDefault(); useMission.setState({ drawer: { kind: "ask" } }); }
      else if (e.key === "[") useMission.setState({ railOpen: !useMission.getState().railOpen });
      else { const n = NAV.find((x) => x[2] === e.key); if (n) router.push(`${n[0]}?${toUrl(useMission.getState())}`); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const partial = s.gravity_g > 0 && s.gravity_g < 1;
  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg px-4">
        <Link href="/" className="display shrink-0 text-[16px]">EmberAtlas</Link>
        {!bare && <div className="mx-auto"><MissionPill /></div>}
        <div className={`flex items-center gap-2 ${bare ? "ml-auto" : ""}`}>
          {!bare && (s.scenarioA
            ? <button className="btn hidden lg:inline-flex" onClick={() => s.set({ scenarioA: null })} title="Clear pinned scenario A">A: {s.scenarioA.label} ✕</button>
            : <button className="btn hidden lg:inline-flex" data-testid="pin-a" onClick={() => s.set({ scenarioA: snapshot(s, MISSIONS.find((m) => m.id === s.preset)?.name.replace(/ \(.*\)/, "") ?? "Custom") })}>Pin as A</button>)}
          {!bare && <span className="hidden lg:inline"><CopyButton text={typeof window === "undefined" ? "" : window.location.href} label="Share" /></span>}
          <button className="btn hidden sm:inline-flex" onClick={() => s.set({ palette: true })} aria-label="Command palette"><span className="num">⌘K</span></button>
          <button className="btn" onClick={() => { const t = s.theme === "dark" ? "light" : "dark"; s.set({ theme: t }); lsSet("ea.theme", t); }} aria-label="Toggle theme">{s.theme === "dark" ? "Ivory" : "Dark"}</button>
        </div>
      </header>
      {!bare && partial && (
        <div className="border-b border-line px-4 py-1.5 text-[12px] text-mute" role="note" data-testid="caveat">
          Partial gravity: bounded estimate from µg + 1 g ISS/ground data. PSI has no partial-gravity tests. <Link href="/methods#limitations" className="underline">Learn how →</Link>
        </div>
      )}
      <div className="flex">
        {!bare && (
          <nav aria-label="Main" className={`sticky top-14 hidden h-[calc(100vh-56px)] shrink-0 flex-col border-r border-line py-3 md:flex ${s.railOpen ? "w-[216px]" : "w-14"}`}>
            {NAV.map(([href, label, key]) => {
              const active = path.startsWith(href.split("/").slice(0, 2).join("/"));
              return (
                <Link key={href} href={`${href}?${toUrl(s)}`} title={`${label}${key ? ` (${key})` : ""}`}
                  className={`mx-2 flex items-center justify-between px-2 py-1.5 text-[14px] ${active ? "bg-surface2 text-ink" : "text-mute hover:text-ink"}`} style={{ borderRadius: 6 }}>
                  {s.railOpen ? label : label[0]}{s.railOpen && key && <span className="num text-[11px] text-faint">{key}</span>}
                </Link>);
            })}
            <div className="mt-auto space-y-1 px-2">
              <button className="btn w-full justify-center" data-testid="ask-open" onClick={() => s.set({ drawer: { kind: "ask" } })}>{s.railOpen ? "Ask EmberAtlas  /" : "?"}</button>
              <button className="w-full text-[12px] text-faint hover:text-mute" onClick={() => s.set({ railOpen: !s.railOpen })}>{s.railOpen ? "« collapse" : "»"}</button>
            </div>
          </nav>
        )}
        <main className={`min-w-0 flex-1 ${bare ? "" : "mx-auto max-w-[1440px] px-4 py-6 md:px-6"}`}>{children}</main>
      </div>
      {!bare && <button className="btn fixed bottom-4 right-4 z-30 bg-panel md:hidden" onClick={() => s.set({ drawer: { kind: "ask" } })}>Ask</button>}

      <AnimatePresence>
        {s.drawer && (
          <motion.div key="scrim" className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => s.set({ drawer: null })}>
            <motion.aside role="dialog" aria-label={s.drawer.kind === "ask" ? "Ask EmberAtlas" : "Receipt"} onClick={(e) => e.stopPropagation()}
              initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={spring.gentle}
              className="absolute right-0 top-0 h-full w-full max-w-[440px] overflow-y-auto border-l border-line bg-panel p-4 shadow-2xl">
              <div className="mb-2 flex justify-end"><button className="btn" onClick={() => s.set({ drawer: null })}>Close <span className="num text-faint">esc</span></button></div>
              {s.drawer.kind === "ask" ? <AskPanel initial={s.drawer.question} /> : <Receipt r={s.drawer.result} title={s.drawer.title} />}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <CommandPalette />
      {s.present && <PresentCursor />}
      {help && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40" onClick={() => setHelp(false)}>
          <div className="w-80 border border-line bg-panel p-4 shadow-2xl" style={{ borderRadius: 8 }}>
            <p className="label mb-2">Keyboard</p>
            <table className="data"><tbody>{[["⌘K", "command palette"], ["/", "ask"], ["?", "this sheet"], ["[", "collapse rail"], ["esc", "close"], ...NAV.filter((n) => n[2]).map((n) => [n[2], n[1]])].map(([k, v]) => <tr key={k}><td className="num">{k}</td><td>{v}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}
    </>
  );
}

function CommandPalette() {
  const s = useMission();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  if (!s.palette) return null;
  const close = () => { s.set({ palette: false }); setQ(""); setI(0); };
  const go = (href: string) => { router.push(`${href}?${toUrl(useMission.getState())}`); close(); };
  const items: { label: string; run: () => void }[] = [
    ...NAV.map(([h, l]) => ({ label: `Go to ${l}`, run: () => go(h) })),
    { label: "Go to Landing", run: () => go("/") }, { label: "Start setup", run: () => go("/start") },
    ...MISSIONS.map((m) => ({ label: `Environment: ${m.name}`, run: () => { s.applyPreset(m.id); close(); } })),
    ...MATERIALS.map((m) => ({ label: `Material: ${m.name}`, run: () => { s.set({ material: m.id }); close(); } })),
    ...GOLDEN_QUESTIONS.map((g) => ({ label: `Ask: ${g}`, run: () => { s.set({ palette: false, drawer: { kind: "ask", question: g } }); setQ(""); } })),
    { label: "Toggle theme", run: () => { s.set({ theme: s.theme === "dark" ? "light" : "dark" }); close(); } },
    { label: `Presentation mode ${s.present ? "off" : "on"}`, run: () => { s.set({ present: !s.present, railOpen: s.present }); close(); } },
    { label: "Copy link", run: () => { navigator.clipboard?.writeText(window.location.href).catch(() => undefined); close(); } },
  ];
  const f = items.filter((x) => x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 pt-[12vh]" onClick={close}>
      <div className="mx-auto w-[min(600px,92vw)] border border-line bg-panel shadow-2xl" style={{ borderRadius: 8 }} onClick={(e) => e.stopPropagation()}>
        <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Type a command…" aria-label="Command"
          onKeyDown={(e) => { if (e.key === "ArrowDown") setI((x) => Math.min(x + 1, f.length - 1)); if (e.key === "ArrowUp") setI((x) => Math.max(x - 1, 0)); if (e.key === "Enter") f[i]?.run(); if (e.key === "Escape") close(); }}
          className="w-full border-0 border-b border-line bg-transparent px-4 py-3 text-[16px] outline-none" style={{ borderRadius: 0 }} />
        <ul role="listbox">{f.map((x, k) => <li key={x.label} role="option" aria-selected={k === i} onMouseEnter={() => setI(k)} onClick={x.run} className={`cursor-pointer px-4 py-2 text-[14px] ${k === i ? "bg-surface2" : ""}`}>{x.label}</li>)}</ul>
      </div>
    </div>
  );
}

function PresentCursor() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => { if (ref.current) ref.current.style.transform = `translate(${e.clientX - 18}px, ${e.clientY - 18}px)`; };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[70] h-9 w-9 rounded-full border-2 border-blue/70" />;
}
