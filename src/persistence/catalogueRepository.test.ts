import { defaultCatalogueView, type CatalogueState } from "../catalogue/model";
import { loadCatalogue, saveCatalogue } from "./catalogueRepository";

describe("catalogue repository", () => {
  it("round-trips catalogue and view state", async () => {
    const state: CatalogueState = {
      catalogueVersion: "test",
      options: [
        {
          id: "one",
          name: "One",
          carbohydratesG: 1,
          sodiumMg: 2,
          waterDeciliters: 3,
          available: false,
          source: "custom",
        },
      ],
    };
    const view = { ...defaultCatalogueView, search: "one", page: 2 };
    await saveCatalogue(state, view);
    await expect(loadCatalogue()).resolves.toEqual({ state, view });
  });
});
