// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import { expect, test } from "@playwright/test";

test("landing page tells the story and links into the live app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fire behaves differently in space");
  await expect(page.getByRole("link", { name: /Start a simulation/ }).first()).toHaveAttribute("href", "/simulator");
  await expect(page.getByRole("link", { name: /Explore the evidence/ })).toHaveAttribute("href", "/methods#data");
  await expect(page.getByRole("navigation", { name: "Explore EmberAtlas" }).getByRole("link")).toHaveCount(3);
  for (const accession of ["PSI-25", "PSI-26", "PSI-69", "PSI-98", "PSI-99", "PSI-100", "PSI-101", "PSI-102"]) {
    await expect(page.getByText(accession, { exact: true })).toBeVisible();
  }
  await expect(page.getByText(/PSI-100 has no O₂ telemetry/)).toBeVisible();
  await expect(page.getByText("Theory-only", { exact: true }).first()).toBeVisible();
  const image = page.getByRole("img", { name: /nearly spherical flame/ });
  await expect(image).toHaveAttribute("src", /science\.nasa\.gov/);
  await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /Original NASA source/ })).toBeVisible();
  await page.getByRole("link", { name: /Start a simulation/ }).first().click();
  await expect(page).toHaveURL(/\/simulator$/);
  await expect(page.getByRole("button", { name: "Enter manually" })).toBeVisible();
});

test("landing page fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(widths.page).toBeLessThanOrEqual(widths.viewport);
  const primaryTile = page.getByRole("navigation", { name: "Explore EmberAtlas" }).getByRole("link").first();
  await expect(primaryTile).toContainText("Simulation Bay");
});
