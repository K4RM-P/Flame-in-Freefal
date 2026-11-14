// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { describe, expect, it } from "vitest";
import gv from "../../shared/golden_vectors.json";
import * as T from "@/lib/physics/thermo";
import { flameTemperature } from "@/lib/physics/flameTemp";
import * as D from "@/lib/physics/droplet";
import * as SU from "@/lib/physics/suppression";
import * as SP from "@/lib/physics/spread";
import * as G from "@/lib/physics/gravity";
import * as SM from "@/lib/physics/smoke";
import * as H from "@/lib/physics/habitat";

/* eslint-disable @typescript-eslint/no-explicit-any */
const G_: any = gv;
const RTOL = G_.rtol as number;
const Tinf = G_.T_inf as number;

function close(a: number | null, b: number | null, rtol = RTOL, label = "") {
  if (a === null || b === null) { expect(a, label).toBe(b); return; }
  const tol = rtol * Math.max(Math.abs(b), 1e-300);
  if (Math.abs(a - b) > tol) throw new Error(`${label}: ts=${a} py=${b} rel=${Math.abs(a - b) / Math.abs(b)}`);
}

describe("golden vectors (Python emberphys == TS port)", () => {
  it("thermo", () => {
    for (const { in: i, out: o } of G_.thermo) {
      close(T.cpMolar(i.sp, i.T), o.cp, RTOL, "cp"); close(T.hMolar(i.sp, i.T), o.h, RTOL, "h");
      close(T.cpMassMix(i.x, i.T), o.cp_mix, RTOL, "cpmix"); close(T.kMix(i.x, i.T), o.k_mix, RTOL, "k");
      close(T.alpha(i.x, i.T, i.P), o.alpha, RTOL, "alpha"); close(T.moleToMass(i.x).O2, o.y_o2, RTOL, "y");
    }
  });
  it("flame temperature", () => {
    for (const { in: i, out: o } of G_.flame_temp) close(flameTemperature(i.fuel, i.x, Tinf), o.T_f, RTOL, "Tf");
  });
  it("droplet K, B, standoff, extinction diameters", () => {
    for (const { in: i, out: o } of G_.droplet) {
      const p = D.paramsFor(i.fuel);
      const st = D.state(i.fuel, i.x, i.P, Tinf, p);
      close(st.K, o.K, RTOL, "K"); close(st.B, o.B, RTOL, "B"); close(st.standoff, o.standoff, RTOL, "S"); close(st.T_f0, o.T_f0, RTOL, "Tf0");
      const [dd, dr] = D.extinctionDiameters(i.fuel, i.x, i.P, Tinf, p);
      close(dd, o.d_diff, RTOL, "d_diff"); close(dr, o.d_rad, RTOL, "d_rad");
    }
  });
  it("suppression", () => {
    for (const { in: i, out: o } of G_.suppression) {
      const base = { O2: i.x_o2, N2: 1 - i.x_o2 };
      close(SU.tAd(i.fuel, base, Tinf), o.T_ad, RTOL, "Tad");
      close(SU.agentFraction(i.fuel, base, i.agent, i.T_crit, Tinf), o.x_agent, RTOL, "xa");
    }
  });
  it("spread + gravity + smoke", () => {
    G_.spread.forEach(({ in: i, out: o }: any, k: number) => {
      const r = SP.spreadRate(i.material, i.x, i.P, i.V_g, Tinf, i.thickness);
      for (const key of ["V_f", "V_thin", "V_thick", "lnDa", "T_f"]) close((r as any)[key], o[key], RTOL, key);
      const gi = G_.gravity[k].in;
      close(G.buoyantVelocity(gi.g, gi.x, gi.P, gi.T_f, Tinf), G_.gravity[k].out.u_b, RTOL, "u_b");
      const si = G_.smoke[k].in, so = G_.smoke[k].out, s = SM.age(si.t, si.N0, si.d0, Tinf, si.P);
      for (const key of ["N", "d30", "d10", "d43", "K_c"]) close((s as any)[key], so[key], RTOL, key);
      close(SM.settlingVelocity(si.d0, si.g, Tinf, si.P), so.v_s, RTOL, "v_s");
    });
  });
  it("habitat ODE (rtol 1e-3)", () => {
    for (const { in: i, out: o } of G_.habitat) {
      const r = H.simulate(i, 31);
      for (const key of ["T", "P", "x_o2", "x_co2"]) r[key as keyof H.Series].forEach((val, j) => close(val, o[key][j], G_.rtol_ode, key));
    }
  });
});
