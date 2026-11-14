// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 3-click demo: Preset → Run → Compare, on the real Saffire replay (PSI-100 telemetry overlay).
import { expect, test } from "@playwright/test";

test("Saffire replay → Run → outcome, evidence, telemetry overlay → Compare", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("preset-saffire").click();
  await page.getByTestId("run").click();
  const outcome = page.getByTestId("outcome-card");
  await expect(outcome).toBeVisible({ timeout: 60_000 });
  await expect(outcome.locator("[data-receipt]").first()).toBeVisible();
  const evidence = page.getByTestId("evidence-list");
  await expect(evidence).toBeVisible();
  await expect(evidence).toContainText("PSI-");
  await expect(page.getByTestId("telemetry-overlay")).toBeVisible();
  await expect(page.getByTestId("interpretation")).toContainText(/OPENAI_API_KEY|AI-generated/);
  await page.getByTestId("compare").click();
  await expect(page.getByTestId("compare")).toBeVisible();
});
