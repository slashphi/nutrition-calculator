import { expect, test } from "@playwright/test";

const validGpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg>
    <trkpt lat="47.0000" lon="11.0000"><ele>1000</ele></trkpt>
    <trkpt lat="47.0450" lon="11.0000"><ele>1500</ele></trkpt>
    <trkpt lat="47.0900" lon="11.0000"><ele>2000</ele></trkpt>
  </trkseg></trk>
</gpx>`;

test("uploads a GPX and adds a water-only station", async ({ page }) => {
  await page.goto("");
  await page.getByLabel(/Weight.*kg/i).fill("80");
  await page.getByLabel(/Expected finishing time/i).fill("10:00");
  await page.getByLabel(/Expected finishing time/i).blur();
  await page.getByRole("button", { name: "Upload GPX" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "course.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from(validGpx),
  });
  await expect(
    page.getByRole("button", { name: /Add aid station/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Add aid station/ }).click();
  await page.getByLabel(/Race kilometre/i).fill("5");
  await page.getByLabel("Water only").check();
  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText("Water only", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".segment-card")).toHaveCount(2);
});

test("rejects a multi-segment GPX", async ({ page }) => {
  await page.goto("");
  await page.getByRole("button", { name: "Upload GPX" }).click();
  const invalid = validGpx.replace("</trkseg>", "</trkseg><trkseg></trkseg>");
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from(invalid),
  });
  await expect(page.getByRole("alert")).toContainText("multiple segments");
});
