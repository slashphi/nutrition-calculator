import { expect, test } from "@playwright/test";

async function completeManualRace(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel(/Weight.*kg/i).fill("80");
  await page.getByLabel(/Expected finishing time/i).fill("10:00");
  await page.getByLabel(/Expected finishing time/i).blur();
  await page.getByLabel(/Distance.*km/i).fill("10");
  await page.getByLabel(/Elevation gain.*m/i).fill("1000");
}

test("manually plans whole servings and restores them", async ({ page }) => {
  await completeManualRace(page);
  await expect(
    page.getByRole("heading", { name: "Nutrition planning" }),
  ).toBeVisible();
  await page.getByLabel("Add nutrition option").selectOption({
    label: "Mynstry – Mynstry Gel 40",
  });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Servings").fill("3");
  await expect(
    page.getByRole("row", { name: /Mynstry – Mynstry Gel 40 3 Available/ }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Servings")).toHaveValue("3");
});

test("creates and can replace an automatic plan", async ({ page }) => {
  await completeManualRace(page);
  await page.getByRole("button", { name: "Create automatic plan" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Automatic plan created.",
  );
  await expect(page.getByLabel("Servings")).toHaveValue("7");
});
