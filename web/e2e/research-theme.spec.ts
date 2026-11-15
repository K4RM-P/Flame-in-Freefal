import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`research pages work in Dark and Ivory at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    for (const theme of ["dark", "light"] as const) {
      await page.goto("/evidence");
      const toggle = page.getByRole("button", { name: "Theme", exact: true });
      if ((await page.locator("html").getAttribute("data-theme")) !== theme) await toggle.click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const table = page.getByRole("region", { name: "Does the Earth test hold up in orbit?" });
      await table.focus();
      await expect(table).toBeFocused();
      if (width < 500) {
        const scroll = await table.evaluate((element) => {
          element.scrollLeft = 60;
          return element.scrollLeft;
        });
        expect(scroll).toBeGreaterThan(0);
      }

      const nav = page.getByRole("navigation", { name: "Main", exact: true });
      for (const name of ["Evidence", "Methods", "About"]) {
        await nav.getByRole("link", { name, exact: true }).click();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (name === "Methods") {
          await page.locator(".ea-model-card").first().click();
          const formula = page.locator(".methods-equation > summary").first();
          await formula.focus();
          await formula.press("Enter");
          await expect(formula.locator("..")).toHaveAttribute("open", "");
        }
        await page.getByRole("button", { name: "Ask Aster" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: "Ask Aster" })).toBeFocused();
      }
    }
    expect(errors).toEqual([]);
  });
}
