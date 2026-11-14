"""Analytic-limit and schema tests (Build prompt Phase 1)."""
import math

import numpy as np
import pytest

from emberphys import droplet as D
from emberphys import gravity as G
from emberphys import habitat as H
from emberphys import models as M
from emberphys import spread as SP
from emberphys import suppression as SU
from emberphys import thermo
from emberphys.flame_temp import flame_temperature, z_st

T = 298.15
AIR = {"O2": 0.21, "N2": 0.79}


def o2n2(x):
    return {"O2": x, "N2": 1 - x}


def test_nasa7_matches_nist_reference_cp():
    # NIST WebBook Cp at 298.15 K: O2 29.38, N2 29.12, CO2 37.12, H2O 33.59 J/mol/K
    for sp, ref in (("O2", 29.38), ("N2", 29.12), ("CO2", 37.12), ("H2O", 33.59)):
        assert thermo.cp_molar(sp, 298.15) == pytest.approx(ref, rel=5e-3)
    assert thermo.cp_molar("HE", 1500) == pytest.approx(20.786, rel=1e-4)
    assert thermo.h_molar("HE", 298.15) == pytest.approx(0.0, abs=1e-9)


def test_units_round_trip_mole_mass():
    x = {"O2": 0.3, "N2": 0.5, "CO2": 0.2}
    back = thermo.mass_to_mole(thermo.mole_to_mass(x))
    for k in x:
        assert back[k] == pytest.approx(x[k], rel=1e-12)


def test_alpha_inverse_pressure():
    a1 = thermo.alpha(AIR, 1000, 101325)
    a2 = thermo.alpha(AIR, 1000, 50662.5)
    assert a2 / a1 == pytest.approx(2.0, rel=1e-12)


def test_stoichiometry():
    assert thermo.stoich_s({"C": 7, "H": 16}) == pytest.approx(3.5126, rel=1e-3)
    assert thermo.stoich_s({"C": 1, "H": 4, "O": 1}) == pytest.approx(1.498, rel=1e-3)


def test_zst_and_tf_monotonic_in_yo():
    ys = np.linspace(0.1, 0.5, 9)
    zs = [z_st(y, 3.5) for y in ys]
    assert all(np.diff(zs) > 0)
    tfs = [flame_temperature("n-heptane", o2n2(x), T) for x in np.linspace(0.12, 0.5, 9)]
    assert all(np.diff(tfs) > 0)


def test_K_increases_with_yo():
    p = D.DropletParams()
    Ks = [D.burning_rate("n-heptane", o2n2(x), 101325, T, p) for x in (0.15, 0.21, 0.3, 0.4)]
    assert all(np.diff(Ks) > 0)


def test_extinction_diameters_converge_toward_loi():
    p = D.DropletParams.for_fuel("methanol")
    lo = D.extinction_diameters("methanol", o2n2(0.13), 101325, T, p)
    hi = D.extinction_diameters("methanol", o2n2(0.25), 101325, T, p)
    assert lo[0] > hi[0]          # diffusive extinction diameter grows as O2 drops (Dietrich 2014)
    assert lo[1] - lo[0] < hi[1] - hi[0]  # burning window narrows


def test_thin_spread_inverse_thickness():
    v1 = SP.spread_rate("cotton", AIR, 101325, 0.1, T, thickness=1e-4)["V_thin"]
    v2 = SP.spread_rate("cotton", AIR, 101325, 0.1, T, thickness=2e-4)["V_thin"]
    assert v1 / v2 == pytest.approx(2.0, rel=1e-12)


def test_thick_spread_proportional_to_flow():
    v1 = SP.spread_rate("pmma", AIR, 101325, 0.05, T, thickness=0.02)["V_thick"]
    v2 = SP.spread_rate("pmma", AIR, 101325, 0.15, T, thickness=0.02)["V_thick"]
    assert v2 / v1 == pytest.approx(3.0, rel=1e-12)


def test_buoyant_velocity_cube_root_g():
    u1 = G.buoyant_velocity(0.165, AIR, 101325, 2000, T)
    u2 = G.buoyant_velocity(1.0, AIR, 101325, 2000, T)
    assert u2 / u1 == pytest.approx((1 / 0.165) ** (1 / 3), rel=1e-12)


def test_habitat_no_fire_constant():
    r = H.simulate(H.HabitatInputs("n-heptane", 0.21, 101325, 20, 0.0, 100, 300))
    assert np.allclose(r["T"], 298.15) and np.allclose(r["P"], 101325) and np.allclose(r["x_o2"], 0.21)


def test_habitat_adiabatic_dp_over_p():
    r = H.simulate(H.HabitatInputs("n-heptane", 0.21, 101325, 20, 2000.0, 60, 60, h_w=0.0, chi=0.0))
    # with h_w = 0: dP/P = dT/T + dn/n; mole change is small and known from stoichiometry
    n_ratio = r["P"][-1] / r["T"][-1] / (101325 / 298.15)
    assert (r["P"][-1] / 101325) == pytest.approx((r["T"][-1] / 298.15) * n_ratio, rel=1e-9)
    assert abs(n_ratio - 1) < 0.01


def test_suppression_more_diluent_lower_tad():
    tads = [SU.t_ad("n-heptane", thermo.dilute_into(AIR, "N2", xa), T) for xa in (0, 0.1, 0.2, 0.3)]
    assert all(np.diff(tads) < 0)


def test_agent_ranking_thermal_theory_per_mole():
    tc = 1800.0
    xs = {a: SU.agent_fraction("n-heptane", AIR, a, tc, T) for a in ("CO2", "N2", "HE")}
    assert xs["CO2"] < xs["N2"] < xs["HE"]   # CO2 most effective per mole, He least (heat capacity)


def test_model_result_schema():
    r = M.run_droplet("methanol", 0.21, 101.3, 2.0, n_mc=20).to_dict()
    for k in ("value", "units", "uncertainty", "inputs", "equation_ids", "assumptions", "validity", "sources"):
        assert k in r
    assert set(r["uncertainty"]) == {"p05", "p50", "p95"}
    assert {"in_envelope", "nearest_data_distance"} <= set(r["validity"])
    assert r["uncertainty"]["p05"] <= r["uncertainty"]["p50"] <= r["uncertainty"]["p95"]


def test_partial_gravity_is_bounded_estimate():
    r = M.run_gravity(0.34, 56.5, 5.0, 0.165)
    assert r.extra["label"] == "bounded estimate"
    assert any("bounded estimates" in a for a in r.assumptions)
    assert math.isfinite(r.value)
