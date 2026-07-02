import type { NutritionOption } from "./model";

export type OptionInput = Pick<
  NutritionOption,
  "name" | "carbohydratesG" | "sodiumMg" | "waterDeciliters"
>;

export type OptionErrors = Partial<Record<keyof OptionInput, string>>;

export function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase("und");
}

export function saltToSodium(saltMg: number): number {
  return Math.round(saltMg / 2.5);
}

export function isSafeWhole(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateOption(
  input: OptionInput,
  options: NutritionOption[],
  editingId?: string,
): OptionErrors {
  const errors: OptionErrors = {};
  const normalized = normalizeName(input.name);
  if (!normalized) errors.name = "required";
  else if (
    options.some(
      (option) =>
        option.id !== editingId && normalizeName(option.name) === normalized,
    )
  )
    errors.name = "duplicate";
  if (!isSafeWhole(input.carbohydratesG)) errors.carbohydratesG = "whole";
  if (!isSafeWhole(input.sodiumMg)) errors.sodiumMg = "whole";
  if (!isSafeWhole(input.waterDeciliters)) errors.waterDeciliters = "water";
  return errors;
}

export function parseWhole(raw: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(raw.trim())) return null;
  const value = Number(raw);
  return isSafeWhole(value) ? value : null;
}

export function parseWater(raw: string): number | null {
  if (!/^(0|[1-9]\d*)(\.\d)?$/.test(raw.trim())) return null;
  const deciliters = Number(raw) * 10;
  return isSafeWhole(deciliters) ? deciliters : null;
}
