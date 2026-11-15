// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// 3D viewport guards: canvas sized by CSS (no DPR cropping), viewport dominance, the scene really renders,
// engine-driven HUD after a full run, and the chrome-less present mode.
import { expect, test, type Page } from "@playwright/test";

const ignorable = (t: string) => /Failed to load resource|THREE\.Clock|PCFSoftShadowMap|deprecated/i.test(t);

async function sampleCentre(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector('[data-testid="viewport"] canvas') as HTMLCanvasElement;
    const w = c.width, h = c.height, x0 = Math.floor(w / 4), y0 = Math.floor(h / 4), cw = Math.floor(w / 2), ch = Math.floor(h / 2);
    const o = document.createElement("canvas"); o.width = cw; o.height = ch;
    const g = o.getContext("2d")!; g.drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    const d = g.getImageData(0, 0, cw, ch).data;
    let n = 0, dark = 0, s = 0, s2 = 0;
    for (let i = 0; i < d.length; i += 16) { const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; s += L; s2 += L * L; if (L < 12) dark++; }
    const mean = s / n; return { darkFrac: dark / n, std: Math.sqrt(Math.max(0, s2 / n - mean * mean)) };
  });
}

for (const dpr of [1, 2]) {
  test.describe(`3D viewport @ DPR ${dpr}`, () => {
    test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });

    test("canvas matches its container, dominates the workspace and renders a lit scene", async ({ page }) => {
      await page.goto("/simulator?preset=lunar-tune");
      const canvas = page.locator('[data-testid="viewport"] canvas').first();
      await expect(canvas).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("scene-empty")).toContainText("Ready");
      await page.waitForTimeout(2500);
      const [cb, vb, wb, dock] = await Promise.all([canvas.boundingBox(), page.getByTestId("viewport").boundingBox(), page.getByTestId("workspace").boundingBox(), page.getByTestId("dock").getAttribute("data-open")]);
      expect(dock).toBe("false");
      for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(cb![k] - vb![k])).toBeLessThanOrEqual(1);
      expect(vb!.height).toBeGreaterThanOrEqual(0.7 * wb!.height);
      const px = await sampleCentre(page);
      expect(px.darkFrac).toBeLessThan(0.15);
      expect(px.std).toBeGreaterThan(12);
    });
  });
}

test("iss-vs-lunar: run, scrub to the end, HUD shows the alarm state, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !ignorable(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/simulator?preset=iss-vs-lunar");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("run")).toHaveText(/Run$/, { timeout: 90_000 });
  const slider = page.getByLabel("Simulation time");
  await slider.focus(); await page.keyboard.press("End");
  await expect(page.getByTestId("hud-alarm").first()).toBeVisible();
  await expect(page.getByTestId("hud-alarm").first()).toHaveText(/ALARM|monitoring|no detector threshold/);
  await expect(page.getByTestId("scene-caption").first()).toContainText(/engine frame \d+\/\d+/i);
  await page.keyboard.press("c");
  await expect(page.getByTestId("dock")).toHaveAttribute("data-open", "true");
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test("?present=1 hides the chrome and shows only the viewport", async ({ page }) => {
  await page.goto("/simulator?preset=lunar-tune&present=1");
  await expect(page.getByTestId("present")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("toolbar", { name: "Simulation" })).toHaveCount(0);
  await expect(page.getByTestId("rail")).toHaveCount(0);
  await expect(page.locator('[data-testid="present"] canvas').first()).toBeVisible({ timeout: 30_000 });
});
