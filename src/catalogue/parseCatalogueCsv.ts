import type { NutritionOption } from "./model";
import { normalizeName, parseWater, parseWhole } from "./validation";

export interface CsvIssue {
  row: number;
}

export interface CsvResult {
  options: NutritionOption[];
  issues: CsvIssue[];
}

const HEADER = "name;carbohydraths;sodium;water";

export function standardOptionId(name: string): string {
  return `standard:${encodeURIComponent(normalizeName(name))}`;
}

export function parseCatalogueCsv(csv: string): CsvResult {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  if (lines[0] !== HEADER) throw new Error("catalogue.invalidHeader");
  const options: NutritionOption[] = [];
  const issues: CsvIssue[] = [];
  const names = new Set<string>();
  lines.slice(1).forEach((line, index) => {
    if (!line.trim()) return;
    const row = index + 2;
    const fields = line.split(";");
    if (fields.length !== 4) {
      issues.push({ row });
      return;
    }
    const [rawName = "", rawCarbs = "", rawSodium = "", rawWater = ""] = fields;
    const name = rawName.trim();
    const normalized = normalizeName(name);
    const carbohydratesG = parseWhole(rawCarbs);
    const sodiumMg = parseWhole(rawSodium);
    const waterDeciliters = parseWater(rawWater);
    if (
      !normalized ||
      carbohydratesG === null ||
      sodiumMg === null ||
      waterDeciliters === null
    ) {
      issues.push({ row });
      return;
    }
    if (names.has(normalized)) return;
    names.add(normalized);
    options.push({
      id: standardOptionId(name),
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
