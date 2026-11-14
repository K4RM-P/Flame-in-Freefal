// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Optional per-page Aster guides (local, no key), page next steps, homepage previews and Theory-only links.
import { expect, test } from "@playwright/test";

const PAGES = [
  { path: "/", page: "overview", text: "FLEX", first: "/simulator" },
  { path: "/match", page: "match", text: "matching NASA study", first: "/methods#data" },
  { path: "/methods", page: "methods", text: "formula card", first: "/methods#overview" },
  { path: "/simulator", page: "simulator", text: "run the scenario", first: "/methods#loop" },
] as const;

for (const p of PAGES) {
  test(`Aster guide on ${p.path} opens the chat with an explanation and two next steps`, async ({ page }) => {
    await page.goto(p.path);
    await page.getByTestId(`aster-guide-${p.page}`).first().click();
    const dialog = page.locator("#aster-dialog");
    await expect(dialog).toBeVisible();
    const guide = dialog.getByTestId("aster-guide").last();
    await expect(guide).toContainText(p.text);
    const steps = guide.getByRole("link");
    await expect(steps).toHaveCount(2);
    await expect(steps.first()).toHaveAttribute("href", p.first);
  });
}

test("homepage cards preview the tools with real records", async ({ page }) => {
  await page.goto("/");
  const index = page.getByRole("navigation", { name: "Explore EmberAtlas" });
  await expect(index.getByText("Illustration of the cabin view · not a run result")).toBeVisible();
  await expect(index.getByText(/PSI-100 · SAFFIRE-III/)).toBeVisible();
  await expect(index.locator(".katex").first()).toBeVisible();
});

test("methods: grouped nav, collapsible formula cards, model anchors for Theory-only links", async ({ page }) => {
  await page.goto("/methods");
  for (const id of ["loop", "overview", "model-spread", "model-habitat", "model-smoke", "model-suppression", "validation", "data", "limitations"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const card = page.locator("#eq-SP1");
  await expect(card.getByText("In the simulator")).toBeHidden();
  await card.locator("summary").click();
  await expect(card.getByText("In the simulator")).toBeVisible();
  await expect(page.getByTestId("validation-tally")).toContainText("pass");
});
