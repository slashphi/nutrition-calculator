import type { CourseGeometry, NutritionResult } from "./model";

export function calculateEffort(distanceKm: number, ascentM: number): number {
  return distanceKm + ascentM / 100;
}

export function calculateNutrition(
  geometry: Pick<CourseGeometry, "distanceKm" | "ascentM">,
  weightKg: number,
  intakePercent: number,
): NutritionResult {
  const energyNeedKcal =
    weightKg * calculateEffort(geometry.distanceKm, geometry.ascentM);
  const intakeTargetKcal = energyNeedKcal * (intakePercent / 100);
  const carbohydratesG = intakeTargetKcal / 4;
  const waterL = carbohydratesG / 80;
  const sodiumMg = waterL * 500;

  return {
    energyNeedKcal,
    intakeTargetKcal,
    carbohydratesG,
    waterL,
    sodiumMg,
  };
}

export function roundTo(value: number, increment: number): number {
  return Number(
    (Math.round((value + Number.EPSILON) / increment) * increment).toFixed(10),
  );
}

export function roundNutrition(result: NutritionResult): NutritionResult {
  return {
    energyNeedKcal: roundTo(result.energyNeedKcal, 10),
    intakeTargetKcal: roundTo(result.intakeTargetKcal, 10),
    carbohydratesG: roundTo(result.carbohydratesG, 1),
    waterL: roundTo(result.waterL, 0.1),
    sodiumMg: roundTo(result.sodiumMg, 1),
  };
}
