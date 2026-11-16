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

test("U2: Methods search finds an equation, highlights it and opens the collapsed card", async ({ page }) => {
  await page.goto("/methods");
  await page.keyboard.press("/");
  await expect(page.locator("#methods-search-input")).toBeFocused();
  await page.keyboard.type("thin fuel spread");
  const hits = page.getByTestId("search-hit");
  await expect(hits.first()).toContainText("Equation");
  await expect(hits.first().locator("mark").first()).toBeVisible();
  await page.screenshot({ path: shot("methods-search") });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#eq-SP1/);
  await expect(page.locator("details#eq-SP1")).toHaveAttribute("open", "");
  await page.goto("/methods?q=quench");
  await expect(page.getByTestId("search-hit").first()).toBeVisible();
});

test("U2: Evidence search finds a PSI dataset by number and deep-links to it", async ({ page }) => {
  await page.goto("/evidence");
  await page.locator("#evidence-search-input").fill("psi 25");
  await expect(page.getByTestId("search-hit").first()).toContainText("PSI-25");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#psi-25/);
  await page.locator("#evidence-search-input").fill("sibal");
  await expect(page.getByTestId("search-hit").first()).toContainText(/Material|Sample/);
});

test("U3: Apply & re-run shows what changed, before and after, from both engine runs", async ({ page }) => {
  await page.goto("/simulator?preset=lunar-design-review&run=1");
  await expect(page.getByTestId("result-headline")).not.toHaveText("No data", { timeout: 60_000 });
  await page.getByTestId("ask-ai").click();
  await page.getByTestId("apply-fix").first().click();
  const diff = page.getByTestId("run-diff").first();
  await expect(diff).toBeVisible({ timeout: 90_000 });
  await expect(diff.getByTestId("diff-inputs")).toContainText("Crew detection");
  await expect(diff.getByTestId("diff-time_to_extinguish")).toContainText(/better|worse|same|no data/);
  await page.screenshot({ path: shot("apply-diff") });
  await page.getByRole("button", { name: "Close drawer" }).click().catch(() => {});
  await page.getByTestId("diff-btn").click();
  await expect(page.locator("[data-testid=run-diff]").last()).toBeVisible();
});

test("U4: the simulator's cabin is plotted on NASA's tested envelope", async ({ page }) => {
  await page.goto("/simulator?preset=iss-vs-lunar&run=1");
  await expect(page.getByTestId("result-headline")).toContainText(/longer/, { timeout: 60_000 });
  await page.getByTestId("next-test-btn").click();
  await page.getByTestId("envelope-link").click();
  await expect(page).toHaveURL(/\/evidence\?o2=34.*#envelope/);
  const ex = page.getByTestId("envelope-explorer");
  await expect(ex.getByTestId("env-verdict")).toContainText("outside the tested range of every PSI solid");
  await expect(ex.locator(".main-svg").first()).toBeVisible({ timeout: 20_000 });
  await ex.scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot("envelope") });
  await ex.getByTestId("env-axis-flow").click();
  await ex.getByTestId("env-cabin").selectOption("ISS");
  await expect(ex.getByTestId("env-verdict")).toContainText("inside the tested range of");
});

test("U5: copy a run link, open it fresh, same scenario re-runs; the test brief downloads", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/simulator?preset=iss-vs-lunar&run=1");
  await expect(page.getByTestId("result-headline")).toContainText(/longer/, { timeout: 60_000 });
  const headline = await page.getByTestId("result-headline").textContent();
  await page.getByTestId("more").click();
  await page.getByTestId("copy-link").click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/simulator\?s=[A-Za-z0-9_-]+&run=1$/);
  const p2 = await context.newPage();
  await p2.goto(url);
  await expect(p2.getByTestId("result-headline")).toHaveText(headline!, { timeout: 60_000 });
  await p2.getByTestId("next-test-btn").click();
  const dl = p2.waitForEvent("download");
  await p2.getByTestId("brief-download").click();
  expect((await dl).suggestedFilename()).toMatch(/next-test-brief\.md$/);
});
