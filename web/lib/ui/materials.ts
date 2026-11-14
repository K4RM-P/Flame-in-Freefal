// Materials the spread/habitat models support (from physics/data/properties.yaml). Nomex etc. are not modelled.
export const MATERIALS = [
  { id: "sibal", name: "SIBAL fabric", detail: "cotton–fiberglass cabin fabric, thermally thin", cls: "Fabrics", thickness_mm: null as number | null },
  { id: "cotton", name: "Cotton sheet 0.1 mm", detail: "cellulose fabric, thermally thin", cls: "Fabrics", thickness_mm: 0.1 },
  { id: "pmma", name: "PMMA 10 mm", detail: "acrylic window plastic, thermally thick", cls: "Plastics", thickness_mm: 10 },
];
export const MATERIAL_CLASSES = ["Fabrics", "Plastics", "Liquids", "Gases", "Smoke"] as const;
export const CLASS_NOTE: Record<string, string> = {
  Liquids: "Liquid fuels (n-heptane, methanol droplets) are in the droplet model.",
  Gases: "Gaseous-fuel investigations (ACME) are in Evidence; no gas-flame model yet.",
  Smoke: "Smoke aging is in the smoke model.",
};
export const CLASS_LINK: Record<string, string> = { Liquids: "/models/droplet", Gases: "/evidence", Smoke: "/models/smoke" };
export const materialById = (id: string) => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];
