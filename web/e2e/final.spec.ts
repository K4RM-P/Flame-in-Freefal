// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 3-click demo: Preset → Run → Compare, on the real Saffire replay (PSI-100 telemetry overlay).
import { expect, test } from "@playwright/test";

test("Saffire replay → Run → outcome, evidence, telemetry overlay → Compare", async ({ page }) => {
  await page.goto("/");
  // First run has no scenario (no demo): enter one manually (test inputs only), which opens the simulator and its presets.
  await page.getByRole("button", { name: "Enter manually" }).click();
  const manual = page.getByTestId("manual-setup");
  const fill: [RegExp, string][] = [[/^Scenario name/, "e2e manual"], [/^Oxygen/, "21"], [/^Pressure/, "101.3"], [/^Cabin volume/, "17.9"],
    [/^Airflow/, "20"], [/^Thickness/, "0.37"], [/^Length/, "29"], [/^Width/, "5"], [/^Detector distance/, "1"], [/^Simulation duration/, "300"]];
  for (const [label, v] of fill) await manual.getByLabel(label).fill(v);
  await manual.getByLabel(/^Material/).selectOption({ index: 1 });
  await manual.getByLabel(/^Gravity/).selectOption({ index: 1 });
  await manual.getByRole("button", { name: /Use these variables/ }).click();
  await page.getByTestId("preset-saffire").click();
  // No sourced Saffire-III Cygnus free volume exists, so Run stays disabled until the user enters one.
  await expect(page.getByTestId("run")).toBeDisabled();
  await expect(page.locator("#run-missing")).toContainText("cabin free volume");
  // Test input only: Saffire-IV Cygnus free volume, NTRS 20210011521 Table 1 (physics/data/saffire_ntrs.yaml).
  await page.getByRole("spinbutton", { name: /Free volume/ }).fill("17.9");
  await page.getByTestId("run").click();
  const outcome = page.getByTestId("outcome-card");
  await expect(outcome).toBeVisible({ timeout: 60_000 });
  await expect(outcome.locator("[data-receipt]").first()).toBeVisible();
  const evidence = page.getByTestId("evidence-list");
  await expect(evidence).toBeVisible();
  await expect(evidence).toContainText("PSI-");
  await expect(page.getByTestId("telemetry-overlay")).toBeVisible();
  // Test server runs without a key, so the request must pass validation and reach the no-key message.
  await expect(page.getByTestId("interpretation")).toContainText("OPENAI_API_KEY", { timeout: 30_000 });
  await expect(page.getByTestId("interpretation")).not.toContainText("invalid request");
  await page.getByTestId("compare").click();
  await expect(page.getByTestId("compare")).toBeVisible();
});
