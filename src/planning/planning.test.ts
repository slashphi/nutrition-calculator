import type { CalculatedPlan, NutritionAssignment } from "../domain/model";
import type { NutritionOption } from "../catalogue/model";
import {
  compareNutrition,
  productTotals,
  segmentPlanning,
} from "./nutritionTotals";
import { planningReducer } from "./planningReducer";
import {
  combineSegments,
  reconcileCatalogue,
  splitSegment,
} from "./reconciliation";

const option = (
  id: string,
  values: Partial<NutritionOption> = {},
): NutritionOption => ({
  id,
  name: id,
  carbohydratesG: 10,
  waterDeciliters: 1,
  sodiumMg: 20,
  available: true,
  source: "custom",
  ...values,
});

describe("planning assignments", () => {
  it("sets one assignment per segment and option and removes zero", () => {
    const first = planningReducer([], {
      type: "set",
      segmentId: "s1",
      optionId: "gel",
      servings: 2,
    });
    const replaced = planningReducer(first, {
      type: "set",
      segmentId: "s1",
      optionId: "gel",
      servings: 3,
    });
    expect(replaced).toEqual([
      { segmentId: "s1", optionId: "gel", servings: 3 },
    ]);
    expect(
      planningReducer(replaced, {
        type: "set",
        segmentId: "s1",
        optionId: "gel",
        servings: 0,
      }),
    ).toEqual([]);
  });

  it("rejects invalid serving counts", () => {
    expect(
      planningReducer([], {
        type: "set",
        segmentId: "s1",
        optionId: "gel",
        servings: 1.5,
      }),
    ).toEqual([]);
  });
});

describe("planning totals", () => {
  it("suppresses shortfalls below thresholds but reports exact thresholds", () => {
    expect(
      compareNutrition(
        { carbohydratesG: 10, waterDeciliters: 2, sodiumMg: 40 },
        { carbohydratesG: 5.01, waterDeciliters: 1.01, sodiumMg: 20.01 },
      ).reportableShortfall,
    ).toEqual({ carbohydratesG: 0, waterDeciliters: 0, sodiumMg: 0 });
    expect(
      compareNutrition(
        { carbohydratesG: 10, waterDeciliters: 2, sodiumMg: 40 },
        { carbohydratesG: 5, waterDeciliters: 1, sodiumMg: 20 },
      ).reportableShortfall,
    ).toEqual({ carbohydratesG: 5, waterDeciliters: 1, sodiumMg: 20 });
  });

  it("derives unavailable status and groups products", () => {
    const assignments: NutritionAssignment[] = [
      { segmentId: "s1", optionId: "drink", servings: 2 },
      { segmentId: "s2", optionId: "drink", servings: 3 },
    ];
    const calculated = {
      nutrition: {
        carbohydratesG: 20,
        waterL: 0.2,
        sodiumMg: 40,
      },
      segments: [
        {
          id: "s1",
          nutrition: {
            carbohydratesG: 20,
            waterL: 0.2,
            sodiumMg: 40,
          },
        },
      ],
    } as CalculatedPlan;
    const segments = segmentPlanning(calculated, assignments, [
      option("drink", { available: false }),
    ]);
    expect(segments[0]?.statuses).toContain("unavailable-option");
    expect(productTotals(assignments)).toEqual([
      { optionId: "drink", servings: 5 },
    ]);
  });
});

describe("planning reconciliation", () => {
  const assignments: NutritionAssignment[] = [
    { segmentId: "left", optionId: "gel", servings: 2 },
    { segmentId: "right", optionId: "gel", servings: 3 },
    { segmentId: "right", optionId: "drink", servings: 1 },
  ];

  it("drops split assignments and merges combined assignments", () => {
    expect(splitSegment(assignments, "left")).toHaveLength(2);
    expect(combineSegments(assignments, ["left", "right"], "combined")).toEqual(
      [
        { segmentId: "combined", optionId: "gel", servings: 5 },
        { segmentId: "combined", optionId: "drink", servings: 1 },
      ],
    );
  });

  it("silently removes deleted catalogue options", () => {
    expect(reconcileCatalogue(assignments, new Set(["gel"]))).toEqual([
      { segmentId: "left", optionId: "gel", servings: 2 },
      { segmentId: "right", optionId: "gel", servings: 3 },
    ]);
  });
});
