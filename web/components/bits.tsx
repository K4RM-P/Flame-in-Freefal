import Link from "next/link";
import { source } from "@/lib/sources";
import type { ModelResult } from "@/lib/physics/models";

export const fmt = (x: number | null | undefined, d = 3) =>
  x == null || !Number.isFinite(x) ? "—" : Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(2) : Number(x.toPrecision(d)).toString();

export function SourcePill({ id }: { id: string }) {
  const s = source(id);
  const outside = /OUTSIDE PSI/.test(s.title);
  return (
    <a href={s.url ?? "/methods#references"} target={s.url ? "_blank" : undefined} rel="noreferrer" title={s.title}
      className={`chip mr-1 mb-1 border ${outside ? "border-warn text-warn" : "border-line text-mute"} hover:text-ink`}>
      [S:{id}]{outside ? " · outside PSI" : ""}
    </a>
  );
}

export function StatusChip({ status }: { status: string }) {
  const cls = status === "pass" ? "bg-ok/20 text-ok" : status === "fail" ? "bg-bad/20 text-bad" : "bg-warn/15 text-warn";
  const icon = status === "pass" ? "✓" : status === "fail" ? "✕" : "…";
  return <span className={`chip ${cls}`}>{icon} {status}</span>;
}

export function ValidityBadges({ r }: { r: ModelResult }) {
  return (
    <span className="flex flex-wrap gap-1">
      {!r.validity.calibrated && <span className="chip bg-warn/15 text-warn">Uncalibrated — theory only</span>}
      {r.validity.calibrated && !r.validity.in_envelope && (
        <span className="chip bg-warn/20 text-warn" title="Inputs outside the calibration data envelope">
          EXTRAPOLATION{r.validity.nearest_data_distance != null ? ` · NN dist ${fmt(r.validity.nearest_data_distance, 2)}σ` : ""}
        </span>
      )}
      {r.validity.calibrated && r.validity.in_envelope && <span className="chip bg-ok/15 text-ok">in calibrated envelope</span>}
      {r.extra.label === "bounded estimate" && <span className="chip bg-blue/15 text-blue">bounded estimate</span>}
      {r.validity.quench_warning && <span className="chip bg-bad/15 text-bad">low-flow quench warning</span>}
    </span>
  );
}

export function Band({ r, d = 3 }: { r: ModelResult; d?: number }) {
  return (
    <span className="num text-xs text-mute">
      p05–p95 {fmt(r.uncertainty.p05, d)}–{fmt(r.uncertainty.p95, d)}
    </span>
  );
}

export function ModelLink({ id }: { id: string }) {
  return <Link href={`/methods#model-${id}`} className="chip border border-line text-ink">[M:{id}]</Link>;
}
