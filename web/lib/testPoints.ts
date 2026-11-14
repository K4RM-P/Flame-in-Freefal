import tp from "@/data/test_points.json";

export interface TestPoint {
  id: string; investigation_id: string; test_label: string; campaign: string; fuel: string; d0_mm: number | null; pressure_kpa: number;
  x_o2: number; p_o2_kpa: number; y_o2: number; diluent: string; x_diluent: number; flow_cm_s: number; gravity_g: number;
  K_mm2_s: number | null; d_ext_mm: number | null; burn_time_s: number | null; test_end: string; outcome: string; cool_flame: boolean;
  mode_inferred: boolean; caption_snippet: string | null; caption_locator: string | null; source_id: string; locator: string;
  digitized: boolean; verified: boolean; split: string;
}
export const TEST_POINTS = tp as unknown as TestPoint[];
