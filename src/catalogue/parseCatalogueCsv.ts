import type { NutritionOption } from "./model";
import { normalizeName, optionKey, parseWater, parseWhole } from "./validation";

export interface CsvIssue {
  row: number;
}

export interface CsvResult {
  options: NutritionOption[];
  issues: CsvIssue[];
}

const HEADER = "brand;name;carbohydraths;sodium;water";

export function standardOptionId(brand: string, name: string): string {
  return `standard:${encodeURIComponent(normalizeName(brand))}:${encodeURIComponent(normalizeName(name))}`;
}

export function parseCatalogueCsv(csv: string): CsvResult {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  if (lines[0] !== HEADER) throw new Error("catalogue.invalidHeader");
  const options: NutritionOption[] = [];
  const issues: CsvIssue[] = [];
  const keys = new Set<string>();
  lines.slice(1).forEach((line, index) => {
    if (!line.trim()) return;
    const row = index + 2;
    const fields = line.split(";");
    if (fields.length !== 5) {
      issues.push({ row });
      return;
    }
    const [
      rawBrand = "",
      rawName = "",
      rawCarbs = "",
      rawSodium = "",
      rawWater = "",
    ] = fields;
    const brand = rawBrand.trim();
    const name = rawName.trim();
    const normalizedBrand = normalizeName(brand);
    const normalizedName = normalizeName(name);
    const carbohydratesG = parseWhole(rawCarbs);
    const sodiumMg = parseWhole(rawSodium);
    const waterDeciliters = parseWater(rawWater);
    if (
      !normalizedBrand ||
      !normalizedName ||
      carbohydratesG === null ||
      sodiumMg === null ||
      waterDeciliters === null
    ) {
      issues.push({ row });
      return;
    }
    const key = optionKey(brand, name);
    if (keys.has(key)) return;
    keys.add(key);
    options.push({
      id: standardOptionId(brand, name),
      brand,
      name,
      carbohydratesG,
      sodiumMg,
      waterDeciliters,
      available: true,
      source: "standard",
    });
  });
  return { options, issues };
}
