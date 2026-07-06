import type {
  CatalogueState,
  CatalogueViewState,
  NutritionOption,
} from "../catalogue/model";
import { defaultCatalogueView } from "../catalogue/model";
import { isSafeWhole, normalizeName, optionKey } from "../catalogue/validation";
import { openDatabase, requestResult, transactionDone } from "./database";

const STATE_KEY = "state";
const VIEW_KEY = "view";

function validOption(value: unknown): value is NutritionOption {
  if (!value || typeof value !== "object") return false;
  const option = value as Partial<NutritionOption>;
  return (
    typeof option.id === "string" &&
    typeof option.brand === "string" &&
    Boolean(normalizeName(option.brand)) &&
    typeof option.name === "string" &&
    Boolean(normalizeName(option.name)) &&
    isSafeWhole(option.carbohydratesG ?? -1) &&
    isSafeWhole(option.sodiumMg ?? -1) &&
    isSafeWhole(option.waterDeciliters ?? -1) &&
    typeof option.available === "boolean" &&
    (option.source === "standard" || option.source === "custom")
  );
}

function validState(value: unknown): value is CatalogueState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<CatalogueState>;
  return (
    typeof state.catalogueVersion === "string" &&
    Array.isArray(state.options) &&
    state.options.every(validOption) &&
    new Set(state.options.map((item) => optionKey(item.brand, item.name)))
      .size === state.options.length
  );
}

function restoreView(value: unknown): CatalogueViewState {
  if (!value || typeof value !== "object") return { ...defaultCatalogueView };
  const view = value as Partial<CatalogueViewState>;
  const sorts = [
    "brand",
    "name",
    "carbohydratesG",
    "sodiumMg",
    "waterDeciliters",
    "available",
    "source",
  ];
  return {
    search: typeof view.search === "string" ? view.search : "",
    brand: typeof view.brand === "string" ? view.brand : "",
    source:
      view.source === "standard" || view.source === "custom"
        ? view.source
        : "all",
    availability:
      view.availability === "available" || view.availability === "unavailable"
        ? view.availability
        : "all",
    sortBy: sorts.includes(view.sortBy ?? "")
      ? (view.sortBy as CatalogueViewState["sortBy"])
      : "brand",
    sortDirection:
      view.sortDirection === "descending" ? "descending" : "ascending",
    page:
      Number.isSafeInteger(view.page) && (view.page ?? 0) > 0 ? view.page! : 1,
  };
}

export async function loadCatalogue(): Promise<{
  state: CatalogueState | null;
  view: CatalogueViewState;
  invalidState: boolean;
}> {
  const database = await openDatabase();
  const transaction = database.transaction("catalogue", "readonly");
  const store = transaction.objectStore("catalogue");
  const [state, view] = await Promise.all([
    requestResult(store.get(STATE_KEY) as IDBRequest<unknown>),
    requestResult(store.get(VIEW_KEY) as IDBRequest<unknown>),
  ]);
  const stateIsValid = validState(state);
  return {
    state: stateIsValid ? state : null,
    view: restoreView(view),
    invalidState: state !== undefined && state !== null && !stateIsValid,
  };
}

export async function saveCatalogue(
  state: CatalogueState,
  view: CatalogueViewState,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction("catalogue", "readwrite");
  transaction.objectStore("catalogue").put(state, STATE_KEY);
  transaction.objectStore("catalogue").put(view, VIEW_KEY);
  await transactionDone(transaction);
}
