import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/console", "/models/spread", "/models/droplet", "/models/suppression", "/models/gravity", "/models/habitat", "/models/smoke",
  "/models/boundary", "/validation", "/evidence", "/gaps", "/implications", "/earth", "/ask", "/methods"];

for (const r of ROUTES) {
  test(`renders ${r}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(r);
    await expect(page.getByTestId("mission-bar")).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });
}

test("mission change updates console and URL", async ({ page }) => {
  await page.goto("/console");
  const card = page.locator("section.card", { hasText: "CO₂ to inert n-heptane" });
  const before = await card.locator(".text-2xl").innerText();
  await page.getByTestId("preset").selectOption("ISS");
  await expect(card.locator(".text-2xl")).not.toHaveText(before);
  await expect(page).toHaveURL(/m=ISS/);
  await page.getByTestId("g-moon").click();
  await expect(page).toHaveURL(/g=0.165/);
});

test("validation table renders with pass and fail chips", async ({ page }) => {
  await page.goto("/validation");
  const t = page.getByTestId("validation-table");
  await expect(t).toContainText("V5");
  await expect(t).toContainText("pass");
  await expect(t).toContainText("fail");
});

test("report export downloads", async ({ page }) => {
  await page.goto("/models/droplet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export").click()]);
  expect(dl.suggestedFilename()).toBe("emberatlas-droplet-report.md");
});

test("evidence CSV export downloads", async ({ page }) => {
  await page.goto("/evidence");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  expect(dl.suggestedFilename()).toBe("emberatlas_test_points.csv");
});

test("ask works in demo mode with tool trace and citations", async ({ page }) => {
  await page.goto("/ask");
  await page.getByRole("button", { name: /Is there lunar-gravity data in PSI/ }).click();
  await expect(page.getByText(/Ran gravity_map/)).toBeVisible();
  await expect(page.getByTestId("ask-panel")).toContainText("bounded estimate");
  await expect(page.getByTestId("ask-panel")).toContainText("numeric guard passed");
});

test("screenshots", async ({ page }) => {
  for (const r of ["/", "/console", "/validation", "/models/droplet", "/evidence", "/gaps"]) {
    await page.goto(r);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/shot${r.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
  }
});
