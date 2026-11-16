// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Smoke tests for the audit upgrades (docs/AUDIT.md). Runs with no OPENAI_API_KEY (offline mode).
import path from "node:path";
import { expect, test } from "@playwright/test";

const shot = (name: string) => path.join(__dirname, "..", "..", "docs", "screenshots", `upgrade-${name}.png`);

test("U1: Aster answers the Moon question from the run, with numbers and NASA citations", async ({ page }) => {
  await page.goto("/simulator?preset=iss-vs-lunar&run=1");
  await expect(page.getByTestId("result-headline")).toContainText(/longer/, { timeout: 60_000 });
  await page.getByRole("button", { name: "Ask Aster" }).click();
  await expect(page.getByTestId("aster-context")).toContainText("This run", { timeout: 20_000 });
  await expect(page.getByTestId("aster-starters")).toBeVisible();
  await page.getByLabel("Question for Aster").fill("Why does the Moon fire last longer?");
  await page.getByLabel("Send").click();
  const answer = page.locator("#aster-dialog [data-testid=guard]").last();
  await expect(answer).toContainText(/\d+ numbers checked against the engine/, { timeout: 30_000 });
  const cites = page.locator("#aster-dialog [data-testid=cites]").last();
  await expect(cites).toContainText("PSI-98");
  await expect(cites).toContainText("PSI-25");
  await expect(cites).toContainText("NTRS 20240015307");
  await expect(page.getByTestId("aster-followups")).toBeVisible();
  await page.screenshot({ path: shot("aster-run") });
});
