import { earthVsOrbit } from "@/lib/sim/evidence";
import type { Scenario } from "@/lib/sim/types";

export function measuredComparisons(scenario: Scenario) {
  const { rows, caveats } = earthVsOrbit(scenario.items.map((item) => item.material_key));
  return {
    caveats: caveats as string[],
    rows: rows.filter((row: { source_id: string; locator: string }) => row.source_id === "PSI-99" && row.locator)
      .slice(0, 8).map((row: {
        sample: string; material: string; thickness: string; o2_raw: string; flow_cm_s: number | null; flow_direction: string;
        g1_burn_length: string; g1_spread_rate: string; ug_burn_length: string; ug_spread: string; locator: string;
      }) => ({
        sample: row.sample, material: row.material, thickness: row.thickness,
        oxygen: row.o2_raw, flow: row.flow_cm_s == null ? "—" : `${row.flow_cm_s} cm/s · ${row.flow_direction ?? "direction unavailable"}`,
        earth: [row.g1_burn_length, row.g1_spread_rate].filter(Boolean).join(" · "),
        orbit: [row.ug_burn_length, row.ug_spread].filter(Boolean).join(" · "),
        locator: row.locator,
      })),
  } as { caveats: string[]; rows: { sample: string; material: string; thickness: string; oxygen: string; flow: string; earth: string; orbit: string; locator: string }[] };
}
