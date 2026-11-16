// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Submission smoke test (no OPENAI_API_KEY): landing, one-click run with badges, evidence datasets, credits,
// Aster answering a run question in offline mode with N > 0 numbers checked, 404, phone fallback.
import { expect, test } from "@playwright/test";

test("landing loads with the hero, steps and team", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "The firefighter for space." })).toBeVisible();
  await expect(page.getByTestId("hero-steps")).toContainText("Ask Aster");
  await expect(page.getByTestId("cta-run")).toContainText("Try the simulator");
  await expect(page.locator("footer")).toContainText("Toronto");
});

test("one-click run shows EXTRAPOLATED, partial-g and certification labels; Aster answers offline", async ({ page }) => {
  await page.goto("/simulator?preset=iss-vs-lunar&run=1");
  await expect(page.getByTestId("extrapolated")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("partial-g")).toBeVisible();
  await expect(page.getByTestId("smoke-uncal")).toBeVisible();
  await expect(page.getByTestId("not-cert")).toBeVisible();
  await page.getByRole("button", { name: "Ask Aster" }).click();
  await page.getByLabel("Question for Aster").fill("Why does the Moon fire last longer?");
  await page.getByRole("button", { name: "Send" }).click();
  const guard = page.getByTestId("guard").last();
  await expect(guard).toContainText(/[1-9]\d* numbers? checked against the engine/, { timeout: 30_000 });
  await expect(page.getByTestId("offline-chip").last()).toBeVisible();
  await expect(page.getByRole("log", { name: "Aster conversation" })).toContainText("PSI-25");
});

test("evidence lists the PSI datasets with uses; credits lists libraries", async ({ page }) => {
  await page.goto("/evidence");
  const table = page.locator("#psi-datasets table");
  await expect(table).toContainText("PSI-100");
  await expect(table).toContainText("used for");
  await page.goto("/credits");
  await expect(page.getByRole("heading", { name: /Code libraries/ })).toBeVisible();
  await expect(page.getByText("Space Grotesk", { exact: true })).toBeVisible();
});

test("unknown route shows the 404 page", async ({ page }) => {
  const r = await page.goto("/no-such-page");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nothing to catch fire here");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("simulator shows the best-on-desktop notice", async ({ page }) => {
    await page.goto("/simulator");
    await expect(page.getByTestId("phone-notice")).toBeVisible();
    for (const path of ["/", "/evidence", "/methods", "/credits", "/about"]) {
      await page.goto(path);
      const w = await page.evaluate(() => ({ v: document.documentElement.clientWidth, p: document.documentElement.scrollWidth }));
      expect(w.p, path).toBeLessThanOrEqual(w.v);
    }
  });
});
