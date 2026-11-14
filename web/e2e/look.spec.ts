// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { test } from "@playwright/test";
test("look", async ({ page }) => {
  test.skip(!process.env.LOOK, "manual");
  for (const [r, n] of (process.env.LOOK ?? "").split(",").map((x) => x.split("="))) {
    await page.goto(r); await page.waitForTimeout(1800);
    await page.screenshot({ path: `${process.env.LOOK_DIR}/${n}.png`, fullPage: true });
  }
});
