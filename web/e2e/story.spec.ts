import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Passes both before the data push (honest "Data pending") and after it (verdict + receipts).
const landed = fs.existsSync(path.join(__dirname, "..", "data", "materials.json"));

test("story: landing → Start a review → Lunar Habitat → SIBAL → verdict, Q1–Q3, receipt, Earth vs orbit, export", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Will it burn on the Moon?");
  await page.getByTestId("cta-start").click();
  await page.getByTestId("start-env-LunarHabitat").click();
  await page.getByTestId("start-mat-sibal").click();
  await expect(page).toHaveURL(/\/review/);

  const chip = page.getByTestId("verdict-chip");
  await expect(chip).toBeVisible();
  for (const q of ["card-q1", "card-q2", "card-q3"]) await expect(page.getByTestId(q)).toBeVisible();
  await expect(page.getByTestId("hero-map")).toBeVisible();
  await expect(page.getByTestId("earth-vs-orbit")).toBeVisible();

  if (!landed) {
    await expect(chip).toContainText("Data pending");
    await expect(page.getByTestId("verdict-sentence")).not.toContainText(/\d+ of \d+ ISS tests/);
  } else {
    await expect(chip).not.toContainText("Data pending");
    const receipt = page.locator("[data-receipt]").first();
    if (await receipt.count()) {
      await receipt.click();
      await expect(page.getByTestId("receipt-drawer")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }

  await page.evaluate(() => { (window as unknown as { print: () => void }).print = () => { document.body.dataset.printed = "1"; }; });
  await page.getByTestId("export-brief").click();
  await page.getByTestId("export-pdf").click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "1");
  await page.getByTestId("export-brief").click();
  const dl = page.waitForEvent("download");
  await page.getByTestId("export-md").click();
  expect((await dl).suggestedFilename()).toMatch(/evidence-brief.*\.md$/);
});
