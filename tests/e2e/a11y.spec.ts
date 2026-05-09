import { expect, test } from "@playwright/test";
import { checkA11y, injectAxe } from "axe-playwright";

test("home page has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await injectAxe(page);
  await checkA11y(page, undefined, {
    detailedReport: true,
    detailedReportOptions: { html: false },
    axeOptions: {
      runOnly: ["wcag2a", "wcag2aa"],
    },
  });
  // Sanity check: heading exists
  await expect(page.getByRole("heading", { name: /TimeGrid/i })).toBeVisible();
});
