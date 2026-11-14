import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const APP = ["/console", "/models/spread", "/models/droplet", "/models/suppression", "/models/gravity", "/models/habitat", "/models/smoke",
  "/models/boundary", "/validation", "/evidence", "/gaps", "/implications", "/earth", "/ask", "/methods"];

for (const r of ["/", "/start", ...APP]) {
  test(`renders ${r}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(r);
    if (APP.includes(r)) await expect(page.getByTestId("mission-bar")).toBeVisible();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
}

test("story path: landing → setup → verdict → moon → receipt → validation → ask → gaps", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("cta-start").click();
  await page.getByTestId("role-safety").click();
  await page.getByTestId("start-env-LunarHabitat").click();
  await page.getByTestId("start-mat-sibal").click();
  await expect(page.getByTestId("verdict")).toContainText("SIBAL fabric at 34% O₂");
  await page.getByTestId("g-ug").dispatchEvent("pointerdown");
  await expect(page).toHaveURL(/g=0(&|$)/);
  await page.getByTestId("g-moon").dispatchEvent("pointerdown");
  await expect(page).toHaveURL(/g=0.165/);
  await expect(page.getByTestId("caveat")).toBeVisible();
  await page.getByTestId("verdict").locator("[data-receipt]").click();
  await expect(page.getByRole("dialog", { name: "Receipt" })).toContainText("Equation");
  await page.keyboard.press("Escape");
  await page.goto("/validation");
  await expect(page.getByTestId("trust-dials")).toContainText("Reliability");
  await page.getByTestId("ask-open").click();
  await page.getByRole("button", { name: /Is there lunar-gravity data in PSI/ }).click().catch(async () => {
    await page.getByText("More questions").click(); await page.getByRole("button", { name: /Is there lunar-gravity data in PSI/ }).click();
  });
  await expect(page.getByTestId("ask-panel")).toContainText("bounded estimate");
  await expect(page.getByTestId("ask-panel")).toContainText("numeric guard passed");
  await page.keyboard.press("Escape");
  await page.goto("/gaps");
  await page.getByTestId("draft-proposal").click();
  await expect(page.getByTestId("ask-panel")).toContainText("Proposed tests", { timeout: 15000 });
});

test("mission pill changes environment and URL", async ({ page }) => {
  await page.goto("/console");
  const before = await page.getByTestId("verdict").innerText();
  await page.getByTestId("seg-env").click();
  await page.getByTestId("env-ISS").click();
  await expect(page).toHaveURL(/m=ISS/);
  await expect(page.getByTestId("verdict")).not.toHaveText(before);
});

test("every result number opens a receipt (spot-check 10)", async ({ page }) => {
  let checked = 0;
  for (const r of ["/console", "/models/droplet", "/models/suppression", "/models/habitat", "/models/smoke", "/models/spread"]) {
    await page.goto(r);
    const n = await page.locator("[data-receipt]").count();
    for (let i = 0; i < n && checked < 10; i++) {
      await page.locator("[data-receipt]").nth(i).click();
      await expect(page.getByRole("dialog", { name: "Receipt" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Receipt" })).toHaveCount(0);
      checked++;
    }
  }
  expect(checked).toBe(10);
});

test("validation scoreboard shows pass and fail", async ({ page }) => {
  await page.goto("/validation");
  const t = page.getByTestId("validation-table");
  await expect(t).toContainText("V5");
  await expect(t).toContainText("✓ pass");
  await expect(t).toContainText("✗ fail");
});

test("report export downloads", async ({ page }) => {
  await page.goto("/models/droplet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export").click()]);
  expect(dl.suggestedFilename()).toBe("emberatlas-droplet-report.md");
});

test("evidence CSV export downloads", async ({ page }) => {
  await page.goto("/evidence");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  expect(dl.suggestedFilename()).toBe("emberatlas_test_points.csv");
});

for (const r of ["/", "/console", "/validation", "/start"]) {
  test(`axe: no serious violations on ${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(800);
    const res = await new AxeBuilder({ page }).exclude(".js-plotly-plot").analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target).join(" | ")}`)).toEqual([]);
  });
}

for (const r of ["/", "/console", "/validation", "/start"]) {
  test(`390 px has no horizontal overflow on ${r}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(r);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
