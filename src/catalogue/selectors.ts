import type { CatalogueViewState, NutritionOption } from "./model";
import { normalizeName } from "./validation";

export const PAGE_SIZE = 20;

export function selectCatalogueBrands(options: NutritionOption[]): string[] {
  return Array.from(new Set(options.map((option) => option.brand))).sort(
    (left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export function selectCatalogue(
  options: NutritionOption[],
  view: CatalogueViewState,
) {
  const search = normalizeName(view.search);
  const brand = normalizeName(view.brand);
  const filtered = options.filter(
    (option) =>
      (!search ||
        normalizeName(option.brand).includes(search) ||
        normalizeName(option.name).includes(search)) &&
      (!brand || normalizeName(option.brand) === brand) &&
      (view.source === "all" || option.source === view.source) &&
      (view.availability === "all" ||
        option.available === (view.availability === "available")),
  );
  const direction = view.sortDirection === "ascending" ? 1 : -1;
  filtered.sort((a, b) => {
    const left = a[view.sortBy];
    const right = b[view.sortBy];
    const primary =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right, undefined, { sensitivity: "base" })
        : Number(left) - Number(right);
    return (
      primary * direction ||
      a.brand.localeCompare(b.brand, undefined, { sensitivity: "base" }) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, view.page), pageCount);
  return {
    options: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    pageCount,
  };
}
