export type NutritionOptionSource = "standard" | "custom";

export interface NutritionOption {
  id: string;
  brand: string;
  name: string;
  carbohydratesG: number;
  sodiumMg: number;
  waterDeciliters: number;
  available: boolean;
  source: NutritionOptionSource;
}

export interface CatalogueState {
  catalogueVersion: string;
  options: NutritionOption[];
}

export type SortField =
  | "brand"
  | "name"
  | "carbohydratesG"
  | "sodiumMg"
  | "waterDeciliters"
  | "available"
  | "source";

export interface CatalogueViewState {
  search: string;
  brand: string;
  source: "all" | NutritionOptionSource;
  availability: "all" | "available" | "unavailable";
  sortBy: SortField;
  sortDirection: "ascending" | "descending";
  page: number;
}

export const defaultCatalogueView: CatalogueViewState = {
  search: "",
  brand: "",
  source: "all",
  availability: "all",
  sortBy: "brand",
  sortDirection: "ascending",
  page: 1,
};
