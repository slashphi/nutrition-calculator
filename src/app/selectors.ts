import {
  type CalculatedPlan,
  type CourseGeometry,
  type RacePlan,
  type SegmentGeometry,
} from "../domain/model";
import { calculateNutrition } from "../domain/nutrition";
import { createEndpoints, totalGeometry } from "../domain/segmentation";
import { resolveSegmentTimes } from "../domain/timeAllocation";
import { validatePlan } from "../domain/validation";
import { segmentGpxCourse } from "../gpx/segmentCourse";

export interface PlanSelection {
  issues: ReturnType<typeof validatePlan>;
  result: CalculatedPlan | null;
  segmentGeometry: SegmentGeometry[];
}

export function courseGeometry(plan: RacePlan): CourseGeometry | null {
  if (!plan.course) return null;
  return plan.course.mode === "gpx"
    ? plan.course.geometry
    : totalGeometry(plan.course.segments);
}

export function selectPlan(
  plan: RacePlan,
  labels: { start: string; finish: string },
): PlanSelection {
  const issues = validatePlan(plan);
  const geometry = courseGeometry(plan);
  if (!geometry || !plan.course)
    return { issues, result: null, segmentGeometry: [] };
  const endpoints = createEndpoints(plan.stations, geometry.distanceKm, labels);
  const segmentGeometry =
    plan.course.mode === "gpx"
      ? segmentGpxCourse(plan.course.points, endpoints)
      : plan.course.segments;
  if (
    issues.length > 0 ||
    plan.weightKg === null ||
    plan.enteredFinishMinutes === null
  ) {
    return { issues, result: null, segmentGeometry };
  }
  const timing = resolveSegmentTimes(
    segmentGeometry,
    plan.enteredFinishMinutes,
    plan.segmentTimeOverrides,
  );
  if (timing.totalMinutes === null)
    return { issues, result: null, segmentGeometry };
  const endpointMap = new Map(
    endpoints.map((endpoint) => [endpoint.id, endpoint]),
  );
  const segments = segmentGeometry.map((segment) => ({
    ...segment,
    from: endpointMap.get(segment.fromId)!,
    to: endpointMap.get(segment.toId)!,
    durationMinutes: timing.times[segment.id] ?? null,
    nutrition: calculateNutrition(segment, plan.weightKg!, plan.intakePercent),
  }));
  return {
    issues,
    segmentGeometry,
    result: {
      geometry,
      totalMinutes: timing.totalMinutes,
      nutrition: calculateNutrition(
        geometry,
        plan.weightKg,
        plan.intakePercent,
      ),
      segments,
    },
  };
}
