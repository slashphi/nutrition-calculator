import { createDefaultPlan, type RacePlan } from "../domain/model";
import { parseGpx } from "../gpx/parseGpx";
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
});
