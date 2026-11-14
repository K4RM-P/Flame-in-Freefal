// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Thin adapter: everything the Console shows, derived from ModelResults (no new physics).
import { runGravity, runHabitat, runSmoke, runSpread, runSuppression, type ModelResult } from "@/lib/physics/models";
import { materialById } from "./materials";
import type { Scenario } from "@/lib/store";
import { gravityName, psia, sig } from "./format";

export interface ConsoleResults { spread: ModelResult; spreadISS: ModelResult; grav: ModelResult; supp: ModelResult; suppRef: ModelResult; hab: ModelResult; smoke: ModelResult }

export function computeScenario(s: Scenario, agent: string, fire: { Q_kW: number; t_s: number }): ConsoleResults {
  const m = materialById(s.material);
  return {
    spread: runSpread(m.id, s.x_o2, s.P_kPa, s.flow_cm_s, m.thickness_mm, s.gravity_g, "opposed", 300),
    spreadISS: runSpread(m.id, 0.21, 101.3, s.flow_cm_s, m.thickness_mm, 0, "opposed", 1),
    grav: runGravity(s.x_o2, s.P_kPa, s.flow_cm_s, s.gravity_g || 0.165, m.id),
    supp: runSuppression(m.id, s.x_o2, s.P_kPa, agent, 120),
    suppRef: runSuppression("n-heptane", s.x_o2, s.P_kPa, agent, 120),
    hab: runHabitat(m.id, s.x_o2, s.P_kPa, s.V_m3, fire.Q_kW, fire.t_s, 1800, 0, false, 20),
    smoke: runSmoke(120, undefined, undefined, s.P_kPa, s.gravity_g),
  };
}

/** Verdict sentence generated only from model outputs (never free text). */
export function verdict(s: Scenario, r: ConsoleResults) {
  const m = materialById(s.material);
  const sp = r.spread, u = sp.uncertainty;
  const quench = !!sp.validity.quench_warning;
  const head = `${m.name} at ${sig(s.x_o2 * 100)}% O₂ · ${sig(psia(s.P_kPa), 2)} psia · ${gravityName(s.gravity_g)}`;
  const claim = quench
    ? `relative flow is below the 5 cm/s BASS-II sensitivity limit, so the flame may quench; if it burns, theory gives`
    : `theory predicts sustained opposed-flow spread of`;
  const ratio = r.spreadISS.value > 0 ? sp.value / r.spreadISS.value : NaN;
  return { head, claim, value: sp.value, p05: u.p05, p95: u.p95, ratio, prob: null as number | null };
}
