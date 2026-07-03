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
  brand = "Test Brand",
): NutritionOption => ({
  id: `${brand}:${name}`,
  brand,
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

  it("requires brands and rejects duplicate brand/name pairs", () => {
    expect(
      validateOption(
        {
          brand: " ",
          name: "Gel",
          carbohydratesG: 0,
          sodiumMg: 0,
          waterDeciliters: 0,
        },
        [],
      ).brand,
    ).toBe("required");
    expect(
      validateOption(
        {
          brand: " test BRAND ",
          name: " energy GEL ",
          carbohydratesG: 0,
          sodiumMg: 0,
          waterDeciliters: 0,
        },
        [option("Energy Gel")],
      ).name,
    ).toBe("duplicate");
    expect(
      validateOption(
        {
          brand: "Other Brand",
          name: "Energy Gel",
          carbohydratesG: 0,
          sodiumMg: 0,
          waterDeciliters: 0,
        },
        [option("Energy Gel")],
      ).name,
    ).toBeUndefined();
  });
});

describe("catalogue CSV", () => {
  it("imports valid rows, reports invalid rows, and silently skips duplicates", () => {
    const result = parseCatalogueCsv(
      "\uFEFFbrand;name;carbohydraths;sodium;water\r\nFuel;Gel;24;200;0.1\r\nFuel;bad;x;2;0.1\r\nfuel;gel;1;1;0.0",
    );
    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({
      brand: "Fuel",
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
    expect(() => parseCatalogueCsv("brand;name;carbs;sodium;water")).toThrow(
      "catalogue.invalidHeader",
    );
  });

  it("keeps standard IDs stable across rows and nutrient changes", () => {
    const first = parseCatalogueCsv(
      "brand;name;carbohydraths;sodium;water\nOther;Drink;1;2;0.0\nFuel;Ä Gel;24;200;0.1",
    );
    const second = parseCatalogueCsv(
      "brand;name;carbohydraths;sodium;water\nFuel;Ä Gel;30;250;0.2\nOther;Drink;1;2;0.0",
    );
    expect(first.options[1]?.id).toBe(second.options[0]?.id);
    expect(first.options[1]?.id).toBe(standardOptionId(" FUEL ", " ä GEL "));
  });

  it("does not collide for distinct brand/name pairs", () => {
    expect(standardOptionId("A+B", "Gel")).not.toBe(
      standardOptionId("A B", "Gel"),
    );
    expect(standardOptionId("Brand", "Ä")).not.toBe(
      standardOptionId("Brand", "A"),
    );
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

  it("searches and sorts by brand", () => {
    const result = selectCatalogue(
      [option("Gel", "standard", "Zulu"), option("Drink", "standard", "Alpha")],
      {
        ...defaultCatalogueView,
        search: "alpha",
      },
    );
    expect(result.options.map((item) => item.name)).toEqual(["Drink"]);
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
