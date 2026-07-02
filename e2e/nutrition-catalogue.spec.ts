import { expect, test } from "@playwright/test";

test("maintains a custom nutrition option", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nutrition options" }).click();

  await expect(
    page.getByRole("heading", { name: "Nutrition options" }),
  ).toBeVisible();
  await expect(page.getByText("Testprodukt")).toBeVisible();

  await page.getByRole("button", { name: /Add option/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add nutrition option" });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Name", { exact: true }).fill("Rice cake");
  await dialog.getByLabel("Carbohydrates (g)", { exact: true }).fill("30");
  await dialog.getByLabel("Entry method", { exact: true }).selectOption("salt");
  await dialog.getByLabel("Salt (mg)", { exact: true }).fill("501");
  await expect(dialog.getByRole("status")).toContainText(
    "Calculated sodium: 200 mg",
  );
  await dialog.getByLabel("Water (L)", { exact: true }).fill("0.0");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText("Rice cake")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Nutrition option added.",
  );
  await page.reload();
  await page.getByRole("button", { name: "Nutrition options" }).click();
  await expect(page.getByText("Rice cake")).toBeVisible();
});
