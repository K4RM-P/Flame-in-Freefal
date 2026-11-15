import { expect, test } from "@playwright/test";

test("Scenario Brief keeps and pre-fills a partial draft for review", async ({ page }) => {
  await page.route("**/api/scenario", (route) => route.fulfill({ json: {
    valid: false, notes: ["Cabin volume was not specified."], rejected: [], missing: ["cabin.V_m3"],
    scenario: {
      name: "Fabric comparison", preset_id: null,
      cabin: { x_o2: 0.34, P_Pa: 56500, gravity_g: 0.165, V_m3: null, flow_m_s: 0.05, fan_off_on_alarm: false },
      items: [{ id: "item-1", material_key: "sibal", thickness_m: 0.00037, length_m: 0.1, width_m: 0.1, ignite: false, t_ignite_s: 0 }],
      detection: { type: "photoelectric", distance_m: 1, threshold: null },
      suppression: { agent: "none", delay_s: 0, mass_kg: 0 }, t_end_s: 60,
    },
  } }));
  await page.goto("/simulator");
  await page.getByRole("textbox", { name: "Fire-safety question" }).fill("Compare fabric in a lunar cabin.");
  await page.getByRole("button", { name: /Build my scenario/ }).click();
  await expect(page.getByRole("heading", { name: "Draft ready for review" })).toBeVisible();
  await expect(page.getByLabel("Oxygen (%)", { exact: true })).toHaveValue("34");
  await page.getByRole("button", { name: /Load draft in Simulator/ }).click();
  await expect(page.getByRole("alert")).toContainText("Enter a cabin volume");
  await page.getByLabel("Cabin volume (m³)").fill("100");
  await page.getByRole("button", { name: /Load draft in Simulator/ }).click();
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Scenario", exact: true })).toContainText("Fabric comparison");
  const run = page.getByRole("toolbar", { name: "Simulation" }).getByRole("button", { name: "Run simulation", exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.getByTestId("run")).toHaveText(/Play|Pause/, { timeout: 90_000 });
});

test("Aster previews a destination and navigates after the visitor clicks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Aster" }).click();
  await page.getByRole("textbox", { name: "Question for Aster" }).fill("Take me to Methods");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: /Open Methods/ }).click();
  await expect(page).toHaveURL(/\/methods$/);
});
