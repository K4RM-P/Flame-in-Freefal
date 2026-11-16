import { expect, test } from "@playwright/test";

test("AI interview: assumptions must be confirmed before Ignite (offline)", async ({ page }) => {
  await page.goto("/simulator");
  await page.getByTestId("build-ai").first().click();
  await page.getByTestId("ai-prompt").fill("a SIBAL curtain catches fire");
  await page.getByTestId("ai-next").click();
  await expect(page.getByTestId("ai-question")).toBeVisible();
  for (let i = 0; i < 4 && await page.getByTestId("ai-question").isVisible().catch(() => false); i++) { await page.getByTestId("ai-option").first().click(); await page.waitForTimeout(200); }
  await expect(page.getByTestId("ai-review")).toContainText("SI assumption");
  await expect(page.getByTestId("ai-ignite")).toBeDisabled();
  await page.getByTestId("ai-confirm").check();
  await expect(page.getByTestId("ai-ignite")).toBeEnabled();
});

test("Aster previews a destination and navigates after the visitor clicks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask Aster", exact: true }).click();
  await page.getByRole("textbox", { name: "Question for Aster" }).fill("Take me to Methods");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: /Open Methods/ }).click();
  await expect(page).toHaveURL(/\/methods$/);
});
