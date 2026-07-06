import { defaultCatalogueView, type CatalogueState } from "../catalogue/model";
import { loadCatalogue, saveCatalogue } from "./catalogueRepository";

describe("catalogue repository", () => {
  it("round-trips catalogue and view state", async () => {
    const state: CatalogueState = {
      catalogueVersion: "test",
      options: [
        {
          id: "one",
          brand: "Brand",
          name: "One",
          carbohydratesG: 1,
          sodiumMg: 2,
          waterDeciliters: 3,
          available: false,
          source: "custom",
        },
      ],
    };
    const view = {
      ...defaultCatalogueView,
      search: "one",
      brand: "Brand",
      page: 2,
    };
    await saveCatalogue(state, view);
    await expect(loadCatalogue()).resolves.toEqual({
      state,
      view,
      invalidState: false,
    });
  });

  it("rejects stored options without a brand", async () => {
    const state = {
      catalogueVersion: "legacy",
      options: [
        {
          id: "legacy",
          name: "Legacy gel",
          carbohydratesG: 1,
          sodiumMg: 2,
          waterDeciliters: 0,
          available: true,
          source: "custom",
        },
      ],
    } as unknown as CatalogueState;
    await saveCatalogue(state, defaultCatalogueView);
    await expect(loadCatalogue()).resolves.toMatchObject({
      state: null,
      invalidState: true,
    });
  });
});
