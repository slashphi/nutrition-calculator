import type { OptimizerInput } from "../model";
import { compareObjectives, type Objective } from "./compareCandidates";
import { optimizePlan } from "./optimizePlan";

const objective = (...values: Partial<Objective>): Objective =>
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, "", ...values].slice(-11) as Objective;

const input = (
  options: OptimizerInput["options"],
  segments = 1,
): OptimizerInput => ({
  deadlineMs: 10_000,
  options,
  segments: Array.from({ length: segments }, (_, index) => ({
    segmentId: `s${index + 1}`,
    target: {
      energyNeedKcal: 0,
      intakeTargetKcal: 0,
      carbohydratesG: 10,
      waterL: 0.1,
      sodiumMg: 20,
    },
  })),
});

describe("optimizer objective", () => {
  it("compares every numeric level before deterministic order", () => {
    for (let index = 0; index < 10; index += 1) {
      const left = objective();
      const right = objective();
      right[index] = 1 as never;
      expect(compareObjectives(left, right)).toBeLessThan(0);
    }
    const left = objective();
    const right = objective();
    left[10] = "a";
    right[10] = "b";
    expect(compareObjectives(left, right)).toBeLessThan(0);
  });
});

describe("automatic optimizer", () => {
  it("finds a covered whole-serving plan within doubled targets", () => {
    const result = optimizePlan(
      input([
        {
          id: "complete",
          carbohydratesG: 10,
          waterDeciliters: 1,
          sodiumMg: 20,
        },
      ]),
    );
    expect(result).toEqual({
      type: "success",
      assignments: [{ segmentId: "s1", optionId: "complete", servings: 1 }],
    });
  });

  it("returns the best undercovered plan when coverage is infeasible", () => {
    const result = optimizePlan(
      input([
        {
          id: "water",
          carbohydratesG: 0,
          waterDeciliters: 1,
          sodiumMg: 0,
        },
      ]),
    );
    expect(result.type).toBe("success");
    if (result.type === "success")
      expect(result.assignments).toContainEqual({
        segmentId: "s1",
        optionId: "water",
        servings: 1,
      });
  });

  it("prefers variety after nutrient metrics across segments", () => {
    const result = optimizePlan(
      input(
        [
          {
            id: "a",
            carbohydratesG: 10,
            waterDeciliters: 1,
            sodiumMg: 20,
          },
          {
            id: "b",
            carbohydratesG: 10,
            waterDeciliters: 1,
            sodiumMg: 20,
          },
        ],
        2,
      ),
    );
    expect(result.type).toBe("success");
    if (result.type === "success")
      expect(
        new Set(result.assignments.map((item) => item.optionId)).size,
      ).toBe(2);
  });

  it("aborts without assignments on timeout or cancellation", () => {
    let time = 0;
    expect(
      optimizePlan(input([]), {
        now: () => time++,
      }),
    ).toEqual({ type: "success", assignments: [] });
    expect(
      optimizePlan({ ...input([]), deadlineMs: 0 }, { now: () => 0 }),
    ).toEqual({ type: "timeout" });
    expect(optimizePlan(input([]), { cancelled: () => true })).toEqual({
      type: "cancelled",
    });
  });

  it("completes a representative three-segment search within two seconds", () => {
    const started = performance.now();
    const result = optimizePlan(
      input(
        ["a", "b", "c"].map((id) => ({
          id,
          carbohydratesG: 10,
          waterDeciliters: 1,
          sodiumMg: 20,
        })),
        3,
      ),
    );
    expect(result.type).toBe("success");
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
