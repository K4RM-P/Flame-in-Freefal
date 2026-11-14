// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { expect, test } from "@playwright/test";

// feature/adopt-ideas acceptance tests (one block per feature).
test("B1: Evidence shows the live PSI catalog and live records on cards", async ({ page }) => {
  await page.goto("/evidence");
  const cat = page.getByTestId("psi-catalog");
  await expect(cat).toContainText("PSI-25");
  await expect(cat).toContainText("Burning and Suppression of Solids - II");
  await expect(cat).toContainText("10.60555/4qc4-de67");
  await expect(page.getByTestId("psi-live").first()).toContainText("Live PSI record");
});

test("B2: Evidence data view loads PSI Experimental tables with provenance", async ({ page }) => {
  await page.goto("/evidence");
  const t = page.getByTestId("psi-tables");
  await expect(t).toContainText("PSI-25_Experimental table_BASS-II.csv, line 2");
  await page.getByTestId("psi-table-select").selectOption("saffire");
  await expect(t).toContainText("PSI-99_Experimental table_SAFFIRE-2.csv");
  await page.goto("/gaps");
  await expect(page.getByTestId("psi-coverage")).toContainText("bass2");
});

test("B3: Console links to the Earth-test-vs-orbit matrix with framing and small-n warning", async ({ page }) => {
  await page.goto("/console");
  await page.getByTestId("link-earth-vs-orbit").click();
  await expect(page).toHaveURL(/evidence#earth-vs-orbit/);
  const m = page.getByTestId("earth-vs-orbit");
  await expect(m).toContainText("small n");
  await expect(m).toContainText("Silicone");
  await expect(m).toContainText("not a verdict on the ground test standard");
  await expect(page.getByTestId("evo-summary")).toContainText("4 of 7 like-for-like samples burned less in orbit");
});

test("B4: lunar habitat shows ACME BRE exploration-atmosphere evidence without claiming a pressure match", async ({ page }) => {
  await page.goto("/start");
  await page.getByTestId("role-safety").click();
  await page.getByTestId("start-env-LunarHabitat").click();
  await page.getByTestId("start-mat-sibal").click();
  const a = page.getByTestId("atmosphere-evidence");
  await expect(a).toContainText("ACME BRE (PSI-20)");
  await expect(a).toContainText("8.2 psia / 34% O₂ is one of the NASA exploration atmospheres");
  await expect(a).toContainText("not identified in the summary table");
});

test("B6: suppression is framed as an ideal calculated flame temperature, helium as a finding", async ({ page }) => {
  await page.goto("/models/suppression");
  const f = page.getByTestId("supp-framing");
  await expect(f).toContainText("ideal, calculated flame temperature where the flame can no longer survive");
  await expect(f).toContainText("radiation and conduction");
  await expect(f).toContainText("not noise");
  await page.goto("/console");
  await expect(page.getByTestId("card-supp")).toContainText("not a measured value");
});

test("B8: PSI Combustion Science resource link on landing and Methods; Limitations listed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("psi-resource-link")).toHaveAttribute("href", "https://psi.nasa.gov/physci/repo/search?q=combustion");
  await page.goto("/methods");
  await expect(page.getByTestId("psi-resource-link")).toContainText("PSI Data Repository: Combustion Science");
  const l = page.getByTestId("limitations");
  for (const t of ["Small n", "Like-for-like", "Calculated vs measured", "No partial-gravity data in PSI", "digitized"]) await expect(l).toContainText(t);
});

test("B5: Implications shows number, first-moment and mass smoke measures with dust overlap and no alarm claim", async ({ page }) => {
  await page.goto("/implications");
  const s = page.getByTestId("smoke-measures");
  await expect(s).toContainText("one smoke, three signals");
  await expect(s).toContainText("ionization-type");
  await expect(s).toContainText("Arizona Road Dust");
  await expect(s).toContainText("no alarm result is stated");
});

test("B7: Implications shows cited concept design suggestions from model outputs", async ({ page }) => {
  await page.goto("/implications");
  const d = page.getByTestId("design-suggestions");
  await expect(d).toContainText("concept recommendations");
  await expect(page.getByTestId("suggest-detection")).toContainText("ionization");
  await expect(page.getByTestId("suggest-suppression")).toContainText("smallest required concentration");
  await expect(page.getByTestId("suggest-ventilation")).toContainText("Not computed");
});
