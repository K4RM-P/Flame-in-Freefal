// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The 3-click demo: Preset → Run → Compare, on the real Saffire replay (PSI-100 telemetry overlay).
import { expect, test } from "@playwright/test";

test("Saffire replay → Run → outcome, evidence, telemetry overlay → Compare", async ({ page }) => {
  await page.goto("/simulator");
  // First run has no scenario (no demo): enter one manually (test inputs only), which opens the simulator and its presets.
  await page.getByRole("button", { name: "Enter manually" }).click();
  const manual = page.getByTestId("manual-setup");
  const fill: [RegExp, string][] = [[/^Scenario name/, "e2e manual"], [/^Oxygen/, "21"], [/^Pressure/, "101.3"], [/^Cabin volume/, "17.9"],
    [/^Airflow/, "20"], [/^Thickness/, "0.37"], [/^Length/, "29"], [/^Width/, "5"], [/^Detector distance/, "1"], [/^Simulation duration/, "300"]];
  for (const [label, v] of fill) await manual.getByLabel(label).fill(v);
  await manual.getByLabel(/^Material/).selectOption({ index: 1 });
  await manual.getByLabel(/^Gravity/).selectOption({ index: 1 });
  await manual.getByRole("button", { name: /Use these variables/ }).click();
  // Presets and inputs live in the collapsible Scenario setup panel.
  await page.locator("#setup-details > summary").click();
  await page.getByTestId("preset-saffire").click();
  // No sourced Saffire-III Cygnus free volume exists, so Run stays disabled until the user enters one.
  await expect(page.getByTestId("run")).toBeDisabled();
  await expect(page.locator("#run-missing")).toContainText("cabin free volume");
  // Test input only: Saffire-IV Cygnus free volume, NTRS 20210011521 Table 1 (physics/data/saffire_ntrs.yaml).
  // The missing-input prompt beside Run opens setup and focuses the field.
  await expect(page.getByTestId("next-step")).toContainText("cabin free volume");
  await page.locator("#run-missing").click();
  await expect(page.getByRole("spinbutton", { name: /Free volume/ })).toBeFocused();
  await page.getByRole("spinbutton", { name: /Free volume/ }).fill("17.9");
  await page.getByTestId("run").click();
  // Workspace: full height, no page scroll on desktop; cabin viewport, legend and layers are visible.
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("cabin-view")).toBeVisible();
  await expect(page.getByTestId("legend")).toBeVisible();
  // Results live in the inspector; the next-step line offers it once the run is done.
  await expect(page.getByTestId("next-step")).toContainText("play back", { timeout: 60_000 });
  await page.getByTestId("next-step").getByRole("button", { name: "Results & evidence" }).click();
  const outcome = page.getByTestId("outcome-card");
  await expect(outcome.locator("[data-receipt]").first()).toBeVisible({ timeout: 60_000 });
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await expect(page.getByTestId("mitigation")).toContainText("No data"); // Saffire preset has no sourced detector threshold
  // Scrub the playhead: the HUD reads engine values at that frame.
  await page.getByRole("slider", { name: "Simulation time" }).evaluate((el: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "10");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(page.getByTestId("hud").locator("[data-receipt]").first()).toBeVisible();
  await page.getByRole("button", { name: "Assumptions / evidence" }).click();
  await expect(page.getByTestId("assumptions")).toContainText("theory-only");
  await page.getByTestId("assumptions").getByRole("button", { name: "Close" }).click();
  await page.getByTestId("tab-evidence").click();
  const evidence = page.getByTestId("evidence-list");
  await expect(evidence).toBeVisible();
  await expect(evidence).toContainText("PSI-");
  await page.getByRole("tab", { name: "Replay vs telemetry" }).click();
  await expect(page.getByTestId("telemetry-overlay")).toBeVisible();
  // Test server runs without a key, so the request must pass validation and reach the no-key message.
  await page.getByTestId("tab-assistant").click();
  await expect(page.getByTestId("interpretation")).toContainText("OPENAI_API_KEY", { timeout: 30_000 });
  await expect(page.getByTestId("interpretation")).not.toContainText("invalid request");
  // Assistant: same no-key error, never a canned answer; the simulator stays usable.
  await page.getByRole("button", { name: "Why did the fire continue?" }).click();
  const answer = page.getByTestId("assistant-answer").last();
  await expect(answer).toContainText("OPENAI_API_KEY", { timeout: 30_000 });
  await expect(answer).not.toContainText("invalid request");
  await expect(page.getByTestId("run")).toBeEnabled();
  await page.getByTestId("compare").click();
  await expect(page.getByTestId("compare")).toBeVisible();
  await expect(page.getByTestId("cabin-view")).toHaveCount(2);
});
