import { expect, test } from "@playwright/test";

test.describe("URL sharing — negative cases", () => {
  test("tampered v2 payload is ignored, no crash", async ({ page }) => {
    await page.goto("/?v=2&payload=ZGFuZ2Vy"); // base64url of 'danger' — fails Zod
    // App still renders; URL gets cleaned (we only care about no error and the heading)
    await expect(page.getByRole("heading", { name: /TimeGrid/i })).toBeVisible();
  });

  test("unknown version is ignored", async ({ page }) => {
    await page.goto("/?v=99&payload=anything");
    await expect(page.getByRole("heading", { name: /TimeGrid/i })).toBeVisible();
  });
});
