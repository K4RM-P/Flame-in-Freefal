// Server-only loader: reads web/data at build/request time so absent contract files degrade to null ("Data pending").
import fs from "node:fs";
import path from "node:path";
import { Boundary, EarthVsOrbit, EvidenceIndex, Investigations, Materials, TestPoints, type ReviewData } from "./index";
import type { ZodTypeAny, z } from "zod";

const DIR = path.join(process.cwd(), "data");

function load<S extends ZodTypeAny>(file: string, schema: S): z.infer<S> | null {
  const p = path.join(DIR, file);
  if (!fs.existsSync(p)) return null;
  const parsed = schema.safeParse(JSON.parse(fs.readFileSync(p, "utf8")));
  if (!parsed.success) {
    console.warn(`[contracts] ${file} fails its schema; treated as pending`, parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}

export function loadReviewData(): ReviewData {
  return {
    investigations: load("investigations.json", Investigations) ?? {},
    testPoints: load("test_points.json", TestPoints) ?? [],
    materials: load("materials.json", Materials),
    earthVsOrbit: load("earth_vs_orbit.json", EarthVsOrbit),
    evidenceIndex: load("evidence_index.json", EvidenceIndex),
    boundary: load("boundary.json", Boundary),
  };
}
