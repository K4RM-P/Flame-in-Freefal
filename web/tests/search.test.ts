// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// U2: in-page search over Methods and Evidence.
import { describe, expect, it } from "vitest";
import { highlightParts, kindOf, norm, search, snippet, tokens, type Entry } from "@/lib/search/pageSearch";

const E: Entry[] = [
  { anchor: "eq-SP1", kind: "Equation", title: "SP1 de Ris thin-fuel spread (full thickness d)", text: "Estimates how quickly flame advances along thin fuel. Vthin: speed (m/s)" },
  { anchor: "psi-25", kind: "NASA dataset", title: "PSI-25 BASS-II", text: "Burning and Suppression of Solids - II, 129 rows" },
  { anchor: "limitations", kind: "Limitation", title: "Gravity only switches the low-flow quench.", text: "For a thin fuel, the de Ris spread rate does not depend on the opposed-flow speed…" },
  { anchor: "source-ntrs-20240015307", kind: "Source", title: "FM2 (Flammability of Materials on the Moon), NTRS 20240015307", text: "ntrs-20240015307 · 2024" },
  { anchor: "where-evidence-stops", kind: "Material", title: "SIBAL Fabric", text: "SIBAL Fabric 14.7–22.1 PSI-98, PSI-99, PSI-100" },
];

describe("page search", () => {
  it("normalises subscripts and µ so 'CO2' finds 'CO₂' and 'ug' finds 'µg'", () => {
    expect(norm("CO₂ µg")).toBe("co2 ug");
    expect(norm("CO₂ µg").length).toBe("CO₂ µg".length);
  });
  it("AND-matches prefixes and ranks title hits first", () => {
    const h = search(E, "thin spread");
    expect(h[0].anchor).toBe("eq-SP1");
    expect(h.map((x) => x.anchor)).toContain("limitations");
  });
  it("exact accession query jumps to the dataset", () => expect(search(E, "psi 25")[0].anchor).toBe("psi-25"));
  it("finds materials, FM2 and the gravity limitation", () => {
    expect(search(E, "sibal")[0].kind).toBe("Material");
    expect(search(E, "moon")[0].anchor).toBe("source-ntrs-20240015307");
    expect(search(E, "gravity quench")[0].kind).toBe("Limitation");
  });
  it("returns nothing for a missing term (no fuzzy invention)", () => expect(search(E, "parchment")).toEqual([]));
  it("highlights every query token and builds a snippet around the first match", () => {
    const parts = highlightParts("Burning and Suppression of Solids", "supp sol");
    expect(parts.filter((p) => p.hit).map((p) => p.s)).toEqual(["Supp", "Sol"]);
    expect(snippet("x ".repeat(200) + "quench here", tokens("quench"))).toContain("quench");
  });
  it("infers kinds from anchors", () => {
    expect(kindOf("eq-DR1")).toBe("Equation");
    expect(kindOf("psi-100")).toBe("NASA dataset");
    expect(kindOf("val-V1")).toBe("Validation");
  });
});
