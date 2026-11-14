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
