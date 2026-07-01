import { createDefaultPlan, type RacePlan } from "./model";
import { initialManualSegment } from "./segmentation";
import { validatePlan } from "./validation";

describe("plan validation", () => {
  function validPlan(): RacePlan {
    return {
      ...createDefaultPlan("en"),
      raceName: "Test race",
      weightKg: 80,
      enteredFinishMinutes: 600,
      course: {
        mode: "manual",
        segments: [
          initialManualSegment({ distanceKm: 10, ascentM: 1000, descentM: 0 }),
        ],
      },
    };
  }

  it("accepts the complete reference plan", () => {
    expect(validatePlan(validPlan())).toEqual([]);
  });

  it.each([39, 151, 80.5])("rejects invalid weight %s", (weightKg) => {
    const plan = validPlan();
    plan.weightKg = weightKg;
    expect(validatePlan(plan)).toContainEqual({
      code: "weightRange",
      fieldPath: "weightKg",
    });
  });

  it("rejects duplicate aid station kilometres", () => {
    const plan = validPlan();
    plan.stations = [
      {
        id: "a",
        name: "A",
        nameSource: "custom",
        kilometer: 5,
        waterOnly: false,
      },
      {
        id: "b",
        name: "B",
        nameSource: "custom",
        kilometer: 5,
        waterOnly: true,
      },
    ];
    expect(
      validatePlan(plan).some((issue) => issue.code === "stationDuplicate"),
    ).toBe(true);
  });
});
