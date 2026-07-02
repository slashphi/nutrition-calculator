import { expect, test } from "@playwright/test";

test("calculates and restores the manual reference plan", async ({ page }) => {
  await page.goto("");
  await page.getByLabel(/Weight.*kg/i).fill("80");
  await page.getByLabel(/Expected finishing time/i).fill("10:00");
  await page.getByLabel(/Expected finishing time/i).blur();
  await page.getByLabel(/Distance.*km/i).fill("10");
  await page.getByLabel(/Elevation gain.*m/i).fill("1000");

  await expect(
    page.getByRole("heading", { name: "Overall nutrition targets" }),
  ).toBeVisible();
  await page.getByLabel("Language").selectOption("de");
  const nutrition = page.locator(".nutrition-grid");
  await expect(nutrition.locator('[data-value="1.600"]')).toBeVisible();
  await expect(nutrition.locator('[data-value="480"]')).toBeVisible();

  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByLabel(/Gewicht.*kg/i)).toHaveValue("80");
  await expect(
    page.locator('.nutrition-grid [data-value="1.600"]'),
  ).toBeVisible();
});

test("has no page-level mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("overrides a segment time and resets it with a new total", async ({
  page,
}) => {
  await page.goto("");
  await page.getByLabel(/Weight.*kg/i).fill("80");
  await page.getByLabel(/Expected finishing time/i).fill("10:00");
  await page.getByLabel(/Expected finishing time/i).blur();
  await page.getByLabel(/Distance.*km/i).fill("10");
  await page.getByLabel(/Elevation gain.*m/i).fill("1000");
  await page.getByRole("button", { name: /Add aid station/ }).click();
  await page.getByLabel(/Race kilometre/i).fill("5");
  await page.getByRole("button", { name: "Save" }).click();

  const firstSegmentTime = page.locator(".segment-time input").first();
  await firstSegmentTime.fill("08:00");
  await firstSegmentTime.blur();
  await expect(page.getByLabel("Current total time")).not.toHaveValue("10:00");

  await page.getByRole("button", { name: "Set new total time" }).click();
  await page.getByLabel("Expected finishing time").last().fill("12:00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Expected finishing time")).toHaveValue("12:00");
});

test("preserves input while switching language", async ({ page }) => {
  await page.goto("");
  await page.getByLabel("Race name").fill("Alpine 100");
  await page.getByLabel("Language").selectOption("de");
  await expect(page.getByLabel("Rennname")).toHaveValue("Alpine 100");
});

test("does not transmit plan data", async ({ page }) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method()))
      mutations.push(request.url());
  });
  await page.goto("");
  await page.getByLabel(/Weight.*kg/i).fill("80");
  await page.getByLabel(/Race name/i).fill("Private race name");
  await page.waitForTimeout(500);
  expect(mutations).toEqual([]);
});
