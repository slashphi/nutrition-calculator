import type { CatalogueViewState, NutritionOption } from "./model";
import { normalizeName } from "./validation";

export const PAGE_SIZE = 20;

export function selectCatalogue(
  options: NutritionOption[],
  view: CatalogueViewState,
) {
  const search = normalizeName(view.search);
  const filtered = options.filter(
    (option) =>
      (!search || normalizeName(option.name).includes(search)) &&
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
