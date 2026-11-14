// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { test } from "@playwright/test";

const ROUTES = ["/", "/start", "/review", "/evidence", "/methods"];
const DIR = process.env.SHOT_DIR;
test.skip(!DIR, "set SHOT_DIR to capture audit screenshots");
for (const [w, h] of [[1440, 900], [390, 844]]) {
  test(`audit screenshots ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    for (const r of ROUTES) {
      const res = await page.goto(r);
      if (!res || res.status() >= 400) continue;
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${DIR}/${w}${r.replace(/\//g, "_") || "_home"}.png`, fullPage: false });
    }
  });
}
