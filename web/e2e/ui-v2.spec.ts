// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// UI v2 quality gates: clean landing render, sticky story stays pinned, reduced motion shows final states,
// simulator chrome ≤ 12 visible controls, 3D canvas + result strip, and axe contrast on the main routes.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const ignorable = (t: string) => /Failed to load resource|THREE\.Clock|PCFSoftShadowMap|deprecated|WebGL|GPU stall/i.test(t);
function collect(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if ((m.type() === "error" || /hydrat/i.test(m.text())) && !ignorable(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("landing renders without console errors or hydration warnings", async ({ page }) => {
  const errors = collect(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("The firefighter for space.");
  await expect(page.getByTestId("hero-status")).toContainText("NASA PSI combustion investigations");
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test("the story panel stays pinned while scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const story = page.locator("#story");
  const top0 = await story.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  const tops: number[] = [];
  for (const f of [0.2, 0.45, 0.7]) {
    await page.evaluate((y) => window.scrollTo(0, y), top0 + f * 3 * 900);
    await page.waitForTimeout(250);
    tops.push(await page.getByTestId("story-sticky").evaluate((el) => Math.round(el.getBoundingClientRect().top)));
  }
  expect(new Set(tops).size).toBe(1);
});

test.describe("reduced motion", () => {
  test("renders final states", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const firstLetter = page.locator("h1 span[aria-hidden] span").first();
    await expect(firstLetter).toHaveCSS("opacity", "1");
    const p = page.getByTestId("hero").locator("p").nth(1);
    await expect(p).toHaveCSS("opacity", "1");
    await expect(page.locator(".animate-marquee").first()).toHaveCSS("animation-name", "none");
  });
});

test("simulator: ≤ 12 visible controls, 3D canvas renders, result strip shows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/simulator?preset=iss-vs-lunar&run=1");
  await expect(page.getByTestId("delta-card")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("extrapolated")).toBeVisible();
  const canvas = page.locator('[data-testid="viewport"] canvas').first();
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000);
  const nonBlack = await canvas.evaluate((c: HTMLCanvasElement) => {
    const o = document.createElement("canvas"); o.width = 64; o.height = 64; const g = o.getContext("2d")!;
    g.drawImage(c, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 36) n++; return n / (64 * 64);
  });
  expect(nonBlack).toBeGreaterThan(0.5);
  const controls = await page.evaluate(() => {
    const ws = document.querySelector('[data-testid="workspace"]')!;
    return [...ws.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])')]
      .filter((e) => !e.closest("canvas") && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden")
      .map((e) => (e.getAttribute("aria-label") || e.textContent || e.tagName).trim());
  });
  expect(controls.length, controls.join(" | ")).toBeLessThanOrEqual(12);
});

for (const route of ["/", "/simulator", "/evidence"]) {
  test(`axe: no serious contrast violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(1500);
    const r = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude("canvas").analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} ${n.failureSummary}`))).toEqual([]);
  });
}
