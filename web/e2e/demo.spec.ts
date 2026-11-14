// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Demo Numbers fills a labelled test case in manual setup and the simulation runs on it.
import { expect, test } from "@playwright/test";

test("Demo Numbers fills manual setup and runs", async ({ page }) => {
  await page.goto("/simulator");
  await page.getByRole("button", { name: "Enter manually" }).click();
  await page.getByTestId("demo-numbers").click();
  await expect(page.getByText("values are not NASA measurements")).toBeVisible();
  await page.getByTestId("manual-setup").getByRole("button", { name: /Use these variables/ }).click();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("run")).toBeEnabled({ timeout: 60_000 });
});
