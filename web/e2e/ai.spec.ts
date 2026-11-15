// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The AI fire engineer, offline (no OPENAI_API_KEY): interview → ignite → flame; empty module; Apply & re-run;
// reduced motion. Also writes docs/screenshots/ai-{interview,thinking,briefing,fix}.png.
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const shot = (name: string) => path.join(__dirname, "..", "..", "docs", "screenshots", `ai-${name}.png`);

async function interview(page: Page, prompt: string, capture = false) {
  await page.goto("/simulator");
  await page.getByTestId("build-ai").first().click();
  await expect(page.getByTestId("ai-interview")).toBeVisible();
  await page.getByTestId("ai-prompt").fill(prompt);
  await page.getByTestId("ai-next").click();
  await expect(page.getByTestId("offline-chip").first()).toBeVisible();
  for (let i = 0; i < 4 && await page.getByTestId("ai-question").isVisible().catch(() => false); i++) {
    if (capture && i === 0) await page.screenshot({ path: shot("interview") });
    await page.getByTestId("ai-option").first().click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId("ai-review")).toBeVisible();
  if (await page.getByTestId("ai-confirm").isVisible()) await page.getByTestId("ai-confirm").check();
  await page.getByTestId("ai-ignite").click();
  await expect(page.getByTestId("ai-interview")).toBeHidden({ timeout: 20_000 });
}

test("Build with AI → answer → Ignite shows a burning flame (offline)", async ({ page }) => {
  await interview(page, "ISS module, cotton fabric panel catches fire", true);
  await expect(page.getByTestId("hud-heat")).toHaveText(/[1-9][\d.]* kW|0\.[0-9]*[1-9][0-9]* kW/, { timeout: 30_000 });
  await expect(page.getByTestId("no-fire")).toHaveCount(0);
});

test("empty ISS module shows the Nothing to catch fire card, and its fix burns", async ({ page }) => {
  await interview(page, "empty ISS module");
  await expect(page.getByTestId("no-fire-title")).toContainText("Nothing to catch fire");
  await page.getByTestId("no-fire-fix").click();
  await expect(page.getByTestId("no-fire")).toHaveCount(0, { timeout: 30_000 });
});

test("thinking trail is driven by real steps (delayed parse request)", async ({ page }) => {
  await page.route("**/api/scenario", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.goto("/simulator");
  await page.getByTestId("build-ai").first().click();
  await page.getByTestId("ai-prompt").fill("Moon base at 34% oxygen with a SIBAL curtain near a hot wire");
  await page.getByTestId("ai-next").click();
  await expect(page.locator('[data-step="read"][data-status="active"]')).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot("thinking") });
  await expect(page.locator('[data-step="mat"][data-status="done"]')).toBeVisible({ timeout: 10_000 });
});

test("briefing streams after a run; Apply & re-run on fix #1 updates the result", async ({ page }) => {
  await page.goto("/simulator?preset=lunar-design-review");
  await page.getByTestId("run").click();
  await page.getByTestId("ask-ai").click();
  await expect(page.getByTestId("briefing")).toBeVisible();
  await expect(page.getByTestId("guard").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-step="guard"][data-status="done"]').first()).toBeVisible();
  await page.screenshot({ path: shot("briefing") });
  await page.getByTestId("apply-fix").first().click();
  await expect(page.getByTestId("fix-after")).toHaveText(/60\s*s/, { timeout: 60_000 });
  await expect(page.getByTestId("result-headline")).toBeVisible();
  await page.screenshot({ path: shot("fix") });
});

test.describe("reduced motion", () => {
  test("orb and glow do not animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/scenario", async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.continue(); });
    await page.goto("/simulator");
    await page.getByTestId("build-ai").first().click();
    await page.getByTestId("ai-prompt").fill("ISS module, cotton fabric panel catches fire");
    await page.getByTestId("ai-next").click();
    const anim = await page.locator('.ai-orb[data-state="thinking"]').first().evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe("none");
    const glow = await page.locator(".ai-glow").first().evaluate((el) => getComputedStyle(el, "::before").animationName);
    expect(glow).toBe("none");
  });
});
