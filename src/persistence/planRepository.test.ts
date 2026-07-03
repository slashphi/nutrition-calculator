import { createDefaultPlan, type RacePlan } from "../domain/model";
import { parseGpx } from "../gpx/parseGpx";
import { openDatabase, PLAN_KEY, transactionDone } from "./database";
import { loadPlan, savePlan } from "./planRepository";

describe("plan repository", () => {
  it("restores processed GPX points without the original file", async () => {
    const parsed = parseGpx(`
      <gpx><rte>
        <rtept lat="47" lon="11"><ele>1000</ele></rtept>
        <rtept lat="47.01" lon="11"><ele>1100</ele></rtept>
      </rte></gpx>
    `);
    const plan: RacePlan = {
      ...createDefaultPlan("en"),
      raceName: "Stored race",
      weightKg: 80,
      enteredFinishMinutes: 600,
      courseMode: "gpx",
      course: { mode: "gpx", id: "stored-course", ...parsed },
    };
    await savePlan(plan);
    const restored = await loadPlan();
    expect(restored?.course?.mode).toBe("gpx");
    if (restored?.course?.mode === "gpx") {
      expect(restored.course.points).toEqual(parsed.points);
    }
  });

  it("round-trips valid nutrition assignments", async () => {
    const plan: RacePlan = {
      ...createDefaultPlan("en"),
      course: {
        mode: "manual",
        segments: [
          {
            id: "start--finish",
            fromId: "start",
            toId: "finish",
            distanceKm: 10,
            ascentM: 100,
            descentM: 100,
          },
        ],
      },
      nutritionAssignments: [
        {
          segmentId: "start--finish",
          optionId: "custom-1",
          servings: 2,
        },
      ],
    };
    await savePlan(plan);
    await expect(loadPlan()).resolves.toMatchObject({
      schemaVersion: 2,
      nutritionAssignments: plan.nutritionAssignments,
    });
  });

  it("migrates schema version 1 plans to an empty assignment list", async () => {
    const legacy = {
      ...createDefaultPlan("en"),
      schemaVersion: 1,
    } as Record<string, unknown>;
    delete legacy.nutritionAssignments;
    const database = await openDatabase();
    const transaction = database.transaction("plans", "readwrite");
    transaction.objectStore("plans").put(legacy, PLAN_KEY);
    await transactionDone(transaction);

    await expect(loadPlan()).resolves.toMatchObject({
      schemaVersion: 2,
      nutritionAssignments: [],
    });
  });

  it("discards malformed, duplicate, and unknown-segment assignments", async () => {
    const stored = {
      ...createDefaultPlan("en"),
      course: {
        mode: "manual",
        segments: [
          {
            id: "start--finish",
            fromId: "start",
            toId: "finish",
            distanceKm: 10,
            ascentM: 100,
            descentM: 100,
          },
        ],
      },
      nutritionAssignments: [
        {
          segmentId: "start--finish",
          optionId: "valid",
          servings: 2,
        },
        {
          segmentId: "start--finish",
          optionId: "valid",
          servings: 3,
        },
        {
          segmentId: "missing",
          optionId: "orphan",
          servings: 1,
        },
        {
          segmentId: "start--finish",
          optionId: "zero",
          servings: 0,
        },
      ],
    };
    const database = await openDatabase();
    const transaction = database.transaction("plans", "readwrite");
    transaction.objectStore("plans").put(stored, PLAN_KEY);
    await transactionDone(transaction);

    await expect(loadPlan()).resolves.toMatchObject({
      nutritionAssignments: [
        {
          segmentId: "start--finish",
          optionId: "valid",
          servings: 2,
        },
      ],
    });
  });
});
