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
