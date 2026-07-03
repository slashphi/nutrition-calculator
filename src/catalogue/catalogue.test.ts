import { parseCatalogueCsv, standardOptionId } from "./parseCatalogueCsv";
import { selectCatalogue } from "./selectors";
import { defaultCatalogueView, type NutritionOption } from "./model";
import {
  normalizeName,
  parseWater,
  parseWhole,
  saltToSodium,
  validateOption,
} from "./validation";

const option = (
  name: string,
  source: NutritionOption["source"] = "custom",
): NutritionOption => ({
  id: name,
  name,
  carbohydratesG: 1,
  sodiumMg: 2,
  waterDeciliters: 3,
  available: true,
  source,
});

describe("catalogue validation", () => {
  it("normalizes names and converts salt", () => {
    expect(normalizeName("  ENERGY Gel ")).toBe("energy gel");
    expect(saltToSodium(501)).toBe(200);
  });

  it("accepts only safe whole values and water tenths", () => {
    expect(parseWhole("24")).toBe(24);
    expect(parseWhole("2.4")).toBeNull();
    expect(parseWhole("1e3")).toBeNull();
    expect(parseWater("0.1")).toBe(1);
    expect(parseWater("0.15")).toBeNull();
  });

  it("rejects case-insensitive duplicate names", () => {
    expect(
      validateOption(
        {
          name: " energy GEL ",
          carbohydratesG: 0,
          sodiumMg: 0,
          waterDeciliters: 0,
        },
        [option("Energy Gel")],
      ).name,
    ).toBe("duplicate");
  });
});

describe("catalogue CSV", () => {
  it("imports valid rows, reports invalid rows, and silently skips duplicates", () => {
    const result = parseCatalogueCsv(
      "\uFEFFname;carbohydraths;sodium;water\r\nGel;24;200;0.1\r\nbad;x;2;0.1\r\ngel;1;1;0.0",
    );
    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({
      name: "Gel",
      carbohydratesG: 24,
      sodiumMg: 200,
      waterDeciliters: 1,
      available: true,
      source: "standard",
    });
    expect(result.issues).toEqual([{ row: 3 }]);
  });

  it("requires the agreed header", () => {
    expect(() => parseCatalogueCsv("name;carbs;sodium;water")).toThrow(
      "catalogue.invalidHeader",
    );
  });

  it("keeps standard IDs stable across rows and nutrient changes", () => {
    const first = parseCatalogueCsv(
      "name;carbohydraths;sodium;water\nOther;1;2;0.0\nÄ Gel;24;200;0.1",
    );
    const second = parseCatalogueCsv(
      "name;carbohydraths;sodium;water\nÄ Gel;30;250;0.2\nOther;1;2;0.0",
    );
    expect(first.options[1]?.id).toBe(second.options[0]?.id);
    expect(first.options[1]?.id).toBe(standardOptionId(" ä GEL "));
  });

  it("does not collide for names with the same simple slug", () => {
    expect(standardOptionId("A+B")).not.toBe(standardOptionId("A B"));
    expect(standardOptionId("Ä")).not.toBe(standardOptionId("A"));
  });
});

describe("catalogue selectors", () => {
  it("combines search and filters and resets no state", () => {
    const result = selectCatalogue(
      [option("Standard gel", "standard"), option("Custom drink")],
      {
        ...defaultCatalogueView,
        search: "gel",
        source: "standard",
        availability: "available",
      },
    );
    expect(result.options.map((item) => item.name)).toEqual(["Standard gel"]);
  });

  it("paginates by twenty and clamps invalid pages", () => {
    const options = Array.from({ length: 21 }, (_, index) =>
      option(`Item ${String(index).padStart(2, "0")}`),
    );
    const result = selectCatalogue(options, {
      ...defaultCatalogueView,
      page: 99,
    });
    expect(result.page).toBe(2);
    expect(result.options).toHaveLength(1);
  });
});
