import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/start", "/review", "/evidence", "/methods"];
const REDIRECTS: [string, RegExp][] = [["/console", /\/review/], ["/gaps", /\/evidence/], ["/earth", /\/evidence/], ["/validation", /\/methods/], ["/models/spread", /\/methods/], ["/kit", /\/methods/]];

for (const r of ROUTES) {
  test(`renders ${r}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(r);
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
}

for (const [from, to] of REDIRECTS) {
  test(`old route ${from} redirects`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  });
}

test("top navigation has exactly three items", async ({ page }) => {
  await page.goto("/review");
  const links = page.getByRole("navigation", { name: "Main" }).getByRole("link");
  await expect(links).toHaveCount(3);
  for (const [i, l] of ["Review", "Evidence Library", "Methods & Validation"].entries()) await expect(links.nth(i)).toHaveAttribute("title", new RegExp(`^${l}`));
});

test("evidence CSV export downloads", async ({ page }) => {
  await page.goto("/evidence");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  expect(dl.suggestedFilename()).toBe("emberatlas_test_points.csv");
});

for (const r of ["/", "/review", "/start"]) {
  test(`axe: no serious violations on ${r}`, async ({ page }) => {
    await page.goto(r);
    await page.waitForTimeout(800);
    const res = await new AxeBuilder({ page }).exclude(".js-plotly-plot").analyze();
    const bad = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target).join(" | ")}`)).toEqual([]);
  });
  test(`390 px has no horizontal overflow on ${r}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(r);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
