// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { expect, test } from "@playwright/test";

test("main navigation includes About and keeps the three research tools", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link")).toHaveText(["Simulator", "Evidence", "Methods", "About"]);
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

test("the Overview language setting translates the introduction and survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Overview language").selectOption("fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comment le feu se comporte-t-il dans l’espace ?");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comment le feu se comporte-t-il dans l’espace ?");
});

test("visitors can follow evidence to the simulator and open a page-specific guide on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByTestId("cta-evidence").click();
  await expect(page).toHaveURL(/\/evidence#earth-vs-orbit$/);
  await page.getByRole("button", { name: "Ask Aster" }).click();
  await expect(page.getByRole("dialog")).toContainText("Evidence guide");
  await page.getByRole("button", { name: "What did Saffire-II test?" }).click();
  await expect(page.getByRole("textbox", { name: "Question for Aster" })).toHaveValue("What did Saffire-II test?");
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("link", { name: "Try a cabin scenario" }).click();
  await expect(page).toHaveURL(/\/simulator$/);
  await page.getByRole("button", { name: "Ask Aster" }).click();
  await expect(page.getByRole("dialog")).toContainText("Simulator guide");
});
