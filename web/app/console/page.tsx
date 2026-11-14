"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plot } from "@/components/Plot";
import { ResultCard, Delta } from "@/components/console/ResultCard";
import { Callout, Segmented, StatusChip, Term, NumberTween } from "@/components/ui-kit";
import { SourcePill } from "@/components/bits";
import { snapshot, useMission, toUrl } from "@/lib/store";
import { computeScenario, verdict } from "@/lib/ui/console";
import { materialById } from "@/lib/ui/materials";
import { statusOf } from "@/lib/ui/status";
import { sig } from "@/lib/ui/format";
import { ACCENT, invColor } from "@/lib/ui/palette";
import { GRAVITY_PRESETS } from "@/lib/missions";
import { linspace } from "@/lib/physics/numerics";
import * as SP from "@/lib/physics/spread";
import { atmosphere } from "@/lib/physics/thermo";
import { T_AMB } from "@/lib/physics/models";
import { PROPS } from "@/lib/physics/data";
import { TEST_POINTS } from "@/lib/testPoints";
import { download } from "@/lib/report";

const QUENCH = PROPS.spread.low_flow_quench_cm_s.value as number;
const AGENTS = [{ v: "CO2", label: "CO₂" }, { v: "N2", label: "N₂" }, { v: "HE", label: "He" }];
const ROLE_ORDER: Record<string, string[]> = { safety: ["spread", "prob", "supp", "hab", "smoke"], research: ["spread", "supp", "smoke", "hab", "prob"], experiment: ["prob", "spread", "supp", "hab", "smoke"] };

export default function Console() {
  const s = useMission();
  const [agent, setAgent] = useState("CO2");
  const [fire, setFire] = useState({ Q_kW: 5, t_s: 180 });
  const [o2Axis, setO2Axis] = useState<"pct" | "kpa">("pct");
  const [sel, setSel] = useState<string[]>([]);
  const [showFlex, setShowFlex] = useState(true);
  const mat = materialById(s.material);
  const cur = useMemo(() => snapshot(s, "B"), [s]);
  const r = useMemo(() => computeScenario(cur, agent, fire), [cur, agent, fire]);
  const A = useMemo(() => (s.scenarioA ? computeScenario(s.scenarioA, agent, fire) : null), [s.scenarioA, agent, fire]);
  const v = verdict(cur, r);
  const spSt = statusOf(r.spread);

  const grid = useMemo(() => {
    const flows = linspace(Math.log10(0.5), Math.log10(60), 32).map((z) => 10 ** z);
    const o2s = linspace(0.12, 0.45, 30);
    const z = o2s.map((x) => flows.map((u) => SP.spreadRate(mat.id, atmosphere(x), s.P_kPa * 1e3, u / 100, T_AMB, mat.thickness_mm === null ? null : mat.thickness_mm * 1e-3).V_f * 1e3));
    return { flows, o2s, z };
  }, [mat, s.P_kPa]);

  const veq = r.spread.extra.V_eq_cm_s as number;
  const ub = r.spread.extra.u_b_cm_s as number;
  const y = (x: number, P: number) => (o2Axis === "pct" ? x * 100 : x * P);
  const flex = showFlex ? TEST_POINTS.filter((t) => t.diluent === "N2") : [];
  const groups = [
    { name: "FLEX · burned ●", pts: flex.filter((t) => t.test_end !== "extinction" && !t.cool_flame), sym: "circle" },
    { name: "FLEX · extinct ✕", pts: flex.filter((t) => t.test_end === "extinction" && !t.cool_flame), sym: "x-thin" },
    { name: "FLEX · cool flame ◇", pts: flex.filter((t) => t.cool_flame), sym: "diamond-open" },
  ];
  const hover = (t: (typeof flex)[number]) => `${t.test_label} · ${t.fuel}<br>O₂ ${t.x_o2} · ${sig(t.pressure_kpa)} kPa · quiescent droplet<br>${t.test_end}${t.outcome.includes("_ext") ? ` (${t.outcome.replace("_ext", "")})` : ""}<br>${t.locator}`;
  const xg = Math.max(s.flow_cm_s, 0.5), xm = Math.max(veq, 0.5), ym = y(s.x_o2, s.P_kPa);
  const order = ROLE_ORDER[s.role] ?? ROLE_ORDER.safety;
  const hab = r.hab.extra as Record<string, number | Record<string, number | null>>;
  const lim = hab.time_to_1h_limit_s as Record<string, number | null>;
  const supU = r.supp.extra as Record<string, number | null>;
  const refU = r.suppRef.extra as Record<string, number | null>;

  const cards: Record<string, React.ReactNode> = {
    spread: <ResultCard key="spread" testid="card-spread" title="Flame spread rate" r={r.spread} aValue={A?.spread.value}
      meaning={<>Opposed-flow spread against {sig(veq)} cm/s {s.gravity_g > 0 && s.gravity_g < 1 ? <Term k="buoyant-equivalent flow">equivalent flow</Term> : "flow"}. {(r.spread.extra.band_mm_s as number[])[0] === (r.spread.extra.band_mm_s as number[])[1] ? "Thin-fuel de Ris spread does not depend on flow, so µg and g-equivalent coincide." : `Band [µg, g-equivalent] ${sig((r.spread.extra.band_mm_s as number[])[0])}–${sig((r.spread.extra.band_mm_s as number[])[1])} mm/s.`}</>} />,
    prob: <ResultCard key="prob" testid="card-prob" title="Burn probability at mission point" r={null}
      meaning={<>No solid-fuel burn/extinct data verified yet, so no probability is shown. <Link href={`/gaps?${toUrl(s)}`} className="underline">See Gaps →</Link></>} />,
    supp: <ResultCard key="supp" testid="card-supp" title={`${AGENTS.find((a) => a.v === agent)?.label} to extinguish`} r={r.supp} scale={100} unit="% (mole)" aValue={A ? A.supp.value * 100 : undefined}
      meaning={<>1 g reference for {mat.name}. µg-calibrated T<sub>crit</sub> exists only for liquid fuels: n-heptane needs {sig((refU.x_agent_ug ?? NaN) * 100)}% µg vs {sig((refU.x_agent_1g ?? NaN) * 100)}% 1 g.</>}>
      <div className="mt-2"><Segmented options={AGENTS} value={agent} onChange={setAgent} /></div>
      <p className="num mt-1 text-[12px] text-faint">{mat.name}: 1 g {sig((supU.x_agent_1g ?? NaN) * 100)}% · µg —</p>
    </ResultCard>,
    hab: <ResultCard key="hab" testid="card-hab" title="Cabin consequence" r={r.hab} unit="K ΔT" aValue={A?.hab.value}
      meaning={<>
        <span className="inline-flex flex-wrap items-center gap-1">
          <input type="number" aria-label="fire size kW" className="num w-14" value={fire.Q_kW} min={0.5} max={50} step={0.5} onChange={(e) => setFire({ ...fire, Q_kW: Number(e.target.value) || 0.5 })} /> kW fire for
          <input type="number" aria-label="burn minutes" className="num w-12" value={fire.t_s / 60} min={0.5} max={30} step={0.5} onChange={(e) => setFire({ ...fire, t_s: (Number(e.target.value) || 0.5) * 60 })} /> min in {s.V_m3} m³:
        </span>
        <span className="num block">ΔP {sig(hab.peak_dP_kPa as number)} kPa · O₂ min {sig((hab.min_x_o2 as number) * 100)}% · CO₂ peak {sig((hab.peak_x_co2 as number) * 100)}% · CO {sig(hab.peak_co_ppm as number)} ppm</span>
        <span className="block">1 h limits reached: CO {lim.CO != null ? `${sig(lim.CO / 60)} min` : "no"} · CO₂ {lim.CO2 != null ? `${sig(lim.CO2 / 60)} min` : "no"}</span>
      </>}>
      <Plot height={70} label="cabin temperature sparkline" data={[{ x: (hab.series as unknown as { t: number[] }).t, y: (hab.series as unknown as { T: number[] }).T, mode: "lines", line: { color: "#9AA1B2", width: 1.5 }, hoverinfo: "skip" }]}
        layout={{ margin: { l: 0, r: 0, t: 4, b: 0 }, xaxis: { visible: false }, yaxis: { visible: false }, showlegend: false }} config={{ staticPlot: true }} />
    </ResultCard>,
    smoke: <ResultCard key="smoke" testid="card-smoke" title="Smoke at detector (2 min)" r={r.smoke} unit="nm"
      meaning={<>Favoured: {String(r.smoke.extra.favoured_detector)}. SAME-R measured averages mostly 200–400 nm <SourcePill id="same-r" />.</>} />,
  };

  const implications = [
    { p: "Prevention", t: `Screen ${mat.name} with low-flow opposed spread tests up to ≈${sig(ub || (r.grav.extra.u_b_cm_s as number))} cm/s, the buoyant-equivalent flow here, not only 1 g upward burning.`, src: "olson-1991" },
    { p: "Detection", t: `A ${fire.Q_kW} kW, ${sig(fire.t_s / 60)} min fire raises cabin pressure by ${sig(hab.peak_dP_kPa as number)} kPa; pressure-rise sensing complements smoke detectors.`, src: "huggett-1980" },
    { p: "Suppression", t: `Thermal theory needs ${sig(r.supp.value * 100)}% ${AGENTS.find((a) => a.v === agent)?.label} (1 g reference) at ${sig(s.x_o2 * 100)}% O₂; enriched O₂ raises agent demand.`, src: "sfpe-beyler" },
  ];

  const lassoRows = TEST_POINTS.filter((t) => sel.includes(t.id));
  return (
    <div className="space-y-6" data-testid="console">
      <header className="space-y-2" data-testid="verdict">
        <p className="label">Verdict</p>
        <h1 className="display measure text-[24px] leading-snug md:text-[32px]">
          {v.head}: {v.claim}{" "}
          <button className="underline decoration-line underline-offset-4" onClick={() => useMission.setState({ drawer: { kind: "receipt", result: r.spread, title: "Flame spread rate" } })} data-receipt>
            <NumberTween value={v.value} s={2} /> mm/s
          </button>{" "}
          <span className="num text-mute">({sig(v.p05, 2)}–{sig(v.p95, 2)})</span>.
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <StatusChip {...spSt} />
          <span className="text-mute">Burn probability: ∅ not available yet</span>
          {Number.isFinite(v.ratio) && <span className="text-mute">≈ {sig(v.ratio, 2)}× the spread at ISS conditions (21% O₂, 101.3 kPa, µg)</span>}
          {A && <Delta a={A.spread.value} b={r.spread.value} />}
          <button className="underline underline-offset-2" onClick={() => useMission.setState({ drawer: { kind: "receipt", result: r.spread, title: "Flame spread rate" } })}>Open receipt</button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Segmented testid="gravity" options={GRAVITY_PRESETS.map((g) => ({ v: g.g, label: g.label, testid: `g-${g.id}` }))} value={s.gravity_g} onChange={(g) => s.set({ gravity_g: g })} />
            <div className="flex items-center gap-2">
              <button className={`chip border ${showFlex ? "border-ink" : "border-line text-mute"}`} onClick={() => setShowFlex(!showFlex)} aria-pressed={showFlex}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: invColor("FLEX") }} />FLEX</button>
              <span className="chip border border-line text-faint" title="No verified points yet">BASS-II ∅</span>
              <Segmented options={[{ v: "pct", label: "O₂ %" }, { v: "kpa", label: "p_O₂ kPa" }]} value={o2Axis} onChange={(a) => setO2Axis(a as "pct" | "kpa")} />
            </div>
          </div>
          <div className="border border-line">
            <Plot height={460} label="Flammability map: O2 versus flow, PSI test points and mission marker"
              onSelected={(e) => setSel((e?.points ?? []).map((p) => (p as unknown as { customdata: string }).customdata).filter(Boolean))}
              config={{ displaylogo: false, responsive: true, modeBarButtonsToRemove: ["zoomIn2d", "zoomOut2d", "autoScale2d", "toggleSpikelines"] }}
              data={[
                { type: "contour", x: grid.flows, y: grid.o2s.map((x) => y(x, s.P_kPa)), z: grid.z, colorscale: [[0, "rgba(154,161,178,0.02)"], [1, "rgba(154,161,178,0.28)"]], showscale: false,
                  contours: { coloring: "fill", showlabels: true, labelfont: { size: 10, color: "#9AA1B2" } }, line: { color: "rgba(154,161,178,0.5)", width: 0.5, dash: "dot" },
                  hovertemplate: "flow %{x:.1f} cm/s<br>O₂ %{y:.1f}<br>theory spread %{z:.2f} mm/s<extra>theory estimate (not validated)</extra>", name: "theory spread mm/s" },
                ...groups.map((g) => ({ type: "scatter" as const, mode: "markers" as const, name: g.name, x: g.pts.map((_, i) => 0.55 + (i % 5) * 0.02), y: g.pts.map((t) => y(t.x_o2, t.pressure_kpa)),
                  customdata: g.pts.map((t) => t.id), text: g.pts.map(hover), hoverinfo: "text" as const,
                  marker: { symbol: g.sym, size: 8, color: invColor("FLEX"), line: { color: invColor("FLEX"), width: 1.5 } } })),
                ...(s.gravity_g > 0 ? [{ type: "scatter" as const, mode: "markers" as const, x: [xg], y: [ym], name: "mission, µg (forced flow only)", marker: { symbol: "circle-open", size: 14, color: "rgba(154,161,178,0.7)", line: { width: 1.5 } }, hoverinfo: "name" as const }] : []),
                { type: "scatter", mode: "markers", x: [xm], y: [ym], name: "mission", marker: { symbol: "cross-thin", size: 22, color: ACCENT, line: { color: ACCENT, width: 3 } },
                  hovertemplate: `mission · ${sig(veq)} cm/s equivalent flow<extra>${s.gravity_g > 0 && s.gravity_g < 1 ? "bounded estimate" : ""}</extra>` },
              ]}
              layout={{
                transition: { duration: 250, easing: "cubic-in-out" },
                xaxis: { type: "log", title: { text: "relative opposed flow (cm/s, log)" }, range: [Math.log10(0.45), Math.log10(60)] },
                yaxis: { title: { text: o2Axis === "pct" ? "O₂ (mole %)" : "p_O₂ (kPa)" } },
                shapes: [{ type: "rect", x0: 0.45, x1: QUENCH, yref: "paper", y0: 0, y1: 1, fillcolor: "rgba(229,72,77,0.06)", line: { width: 0 } }],
                annotations: [
                  { x: Math.log10(1.6), y: 0.99, yref: "paper", text: `< ${QUENCH} cm/s: quench-sensitive (BASS-II)`, showarrow: false, font: { size: 10, color: "#E5484D" } },
                  ...(s.gravity_g > 0 && xm > xg ? [{ x: Math.log10(xm), y: ym, ax: Math.log10(xg), ay: ym, axref: "x" as const, ayref: "y" as const, xref: "x" as const, yref: "y" as const, showarrow: true, arrowhead: 2, arrowcolor: "#9AA1B2", arrowwidth: 1, text: "", standoff: 10 },
                    { x: (Math.log10(xm) + Math.log10(xg)) / 2, y: ym, yshift: 14, xref: "x" as const, yref: "y" as const, text: `+${sig(ub)} cm/s buoyant-equivalent flow`, showarrow: false, font: { size: 11, color: "#9AA1B2" } }] : []),
                ],
                legend: { orientation: "h", y: -0.2, font: { size: 11 } }, dragmode: "pan",
              }} />
          </div>
          {sel.length > 0 && (
            <div className="mt-2 flex items-center gap-3 text-[13px]"><span className="num">{sel.length} tests selected</span>
              <button className="btn" onClick={() => download("emberatlas_selected.json", JSON.stringify(lassoRows, null, 1), "application/json")}>Export</button>
              <Link className="btn" href={`/evidence?${toUrl(s)}`}>Open in Evidence</Link></div>)}
          <div className="mt-3 space-y-2">
            <Callout>In microgravity, hot gas doesn&apos;t rise, so heat and smoke stay near the flame. Ventilation is the only thing moving air; at lunar g buoyancy partly returns — worth ≈{sig(r.grav.extra.u_b_cm_s as number)} cm/s here (gravity model, bounded estimate).</Callout>
            <p className="text-[12px] text-faint">How to read: shaded contours are uncalibrated de Ris spread rates (mm/s); FLEX points are quiescent droplets plotted at the left edge. The cross is your mission at its equivalent flow. Use the lasso to select tests.</p>
          </div>
        </section>
        <aside className="space-y-3 lg:col-span-4">{order.map((k) => cards[k])}</aside>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between"><p className="label">What this means</p>
          {!s.scenarioA && <button className="btn" onClick={() => s.set({ scenarioA: snapshot(s, "this scenario") })}>Pin as A to compare</button>}</div>
        <div className="grid gap-3 md:grid-cols-3">
          {implications.map((i) => <div key={i.p} className="border-t border-line pt-2 text-[13px]"><p className="font-medium">{i.p}</p><p className="text-mute">{i.t} <SourcePill id={i.src} /></p></div>)}
        </div>
      </section>
    </div>
  );
}
