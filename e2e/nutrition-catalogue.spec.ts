import { expect, test } from "@playwright/test";

test("maintains a custom nutrition option", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nutrition options" }).click();

  await expect(
    page.getByRole("heading", { name: "Nutrition options" }),
  ).toBeVisible();
  await expect(page.getByText("Testprodukt")).toBeVisible();

  await page.getByRole("button", { name: /Add option/ }).click();
  await page.getByLabel("Name").fill("Rice cake");
  await page.getByLabel("Carbohydrates (g)").fill("30");
  await page.getByLabel("Entry method").selectOption("salt");
  await page.getByLabel("Salt (mg)").fill("501");
  await expect(page.getByRole("status")).toContainText(
    "Calculated sodium: 200 mg",
  );
  await page.getByLabel("Water (L)").fill("0.0");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Rice cake")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Nutrition options" }).click();
  await expect(page.getByText("Rice cake")).toBeVisible();
});
