// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { expect, test } from "@playwright/test";

test("main nav is Simulator · Evidence · Methods; About is in the footer", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Simulator", "Evidence", "Methods"]);
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Experiment match" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "EmberAtlas", exact: true })).toHaveAttribute("href", "/");
  await expect(page.locator("footer").getByRole("link", { name: /About/ })).toHaveAttribute("href", "/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("old routes redirect", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/simulator$/);
  await page.goto("/match");
  await expect(page).toHaveURL(/\/evidence$/);
});

test("landing page fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
});
