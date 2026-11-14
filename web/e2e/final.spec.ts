// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The judged path: landing CTA → simulator auto-runs ISS vs Lunar Habitat → delta card + EXTRAPOLATED → Evidence page.
import { expect, test } from "@playwright/test";

test("Run ISS vs Lunar Habitat from the landing page, then open the evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Run ISS vs Lunar Habitat" }).or(page.getByRole("button", { name: "Run ISS vs Lunar Habitat" })).first().click();
  await expect(page).toHaveURL(/\/simulator\?preset=iss-vs-lunar/);
  await expect(page.getByTestId("workspace")).toBeVisible();
  // Monte Carlo run (A and B) starts automatically: the presets are fully sourced.
  await expect(page.getByTestId("delta-card")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("extrapolated")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("delta-card")).toContainText("Next test to fly");
  await page.goto("/evidence");
  await expect(page.getByTestId("evo-counts")).toContainText("like-for-like");
});
