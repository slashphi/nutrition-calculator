import type { RacePlan, ValidationIssue } from "./model";
import { totalGeometry } from "./segmentation";

export function validatePlan(plan: RacePlan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!plan.raceName.trim())
    issues.push({ code: "required", fieldPath: "raceName" });
  if (
    plan.weightKg === null ||
    !Number.isInteger(plan.weightKg) ||
    plan.weightKg < 40 ||
    plan.weightKg > 150
  ) {
    issues.push({ code: "weightRange", fieldPath: "weightKg" });
  }
  if (
    !Number.isInteger(plan.intakePercent) ||
    plan.intakePercent < 1 ||
    plan.intakePercent > 100
  ) {
    issues.push({ code: "percentRange", fieldPath: "intakePercent" });
  }
  if (plan.enteredFinishMinutes === null || plan.enteredFinishMinutes <= 0) {
    issues.push({ code: "duration", fieldPath: "finishTime" });
  }
  if (!plan.course) {
    issues.push({ code: "courseRequired", fieldPath: "course" });
    return issues;
  }
  const geometry =
    plan.course.mode === "gpx"
      ? plan.course.geometry
      : totalGeometry(plan.course.segments);
  if (!Number.isFinite(geometry.distanceKm) || geometry.distanceKm <= 0) {
    issues.push({ code: "distancePositive", fieldPath: "course.distanceKm" });
  }
  if (
    geometry.ascentM < 0 ||
    geometry.descentM < 0 ||
    (plan.course.mode === "manual" &&
      (!Number.isInteger(geometry.ascentM) ||
        !Number.isInteger(geometry.descentM)))
  ) {
    issues.push({ code: "elevationWhole", fieldPath: "course.elevation" });
  }
  if (geometry.distanceKm + geometry.ascentM / 100 <= 0) {
    issues.push({ code: "effortPositive", fieldPath: "course" });
  }
  const sorted = [...plan.stations].sort((a, b) => a.kilometer - b.kilometer);
  sorted.forEach((station, index) => {
    if (station.kilometer <= 0 || station.kilometer >= geometry.distanceKm) {
      issues.push({
        code: "stationRange",
        fieldPath: `stations.${station.id}.kilometer`,
      });
    }
    if (index > 0 && station.kilometer === sorted[index - 1]!.kilometer) {
      issues.push({
        code: "stationDuplicate",
        fieldPath: `stations.${station.id}.kilometer`,
      });
    }
  });
  return issues;
}
