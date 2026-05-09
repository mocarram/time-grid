import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("app loads and renders the heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /TimeGrid/i })).toBeVisible();
  });

  test("default workspace appears on first load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Personal/i })).toBeVisible();
  });

  test("add-timezone dialog opens and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add timezone" }).click();
    await expect(page.getByRole("dialog", { name: /Add Timezone/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Add Timezone/i })).toBeHidden();
  });

  test("share button shows tooltip", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Share current view/i })).toBeVisible();
  });
});
