import type {
  CalculatedPlan,
  NutritionAssignment,
  NutritionResult,
} from "../domain/model";
import type { NutritionOption } from "../catalogue/model";
import type {
  NutrientAmount,
  NutrientComparison,
  PlanningStatus,
} from "./model";

export const SHORTFALL_TOLERANCE: NutrientAmount = {
  carbohydratesG: 5,
  waterDeciliters: 1,
  sodiumMg: 20,
};

const EPSILON = 1e-9;

function zeroAmount(): NutrientAmount {
  return { carbohydratesG: 0, waterDeciliters: 0, sodiumMg: 0 };
}

export function nutritionTarget(result: NutritionResult): NutrientAmount {
  return {
    carbohydratesG: result.carbohydratesG,
    waterDeciliters: result.waterL * 10,
    sodiumMg: result.sodiumMg,
  };
}

export function plannedAmount(
  assignments: NutritionAssignment[],
  options: NutritionOption[],
): NutrientAmount {
  const byId = new Map(options.map((option) => [option.id, option]));
  return assignments.reduce((total, assignment) => {
    const option = byId.get(assignment.optionId);
    if (!option) return total;
    total.carbohydratesG += assignment.servings * option.carbohydratesG;
    total.waterDeciliters += assignment.servings * option.waterDeciliters;
    total.sodiumMg += assignment.servings * option.sodiumMg;
    return total;
  }, zeroAmount());
}

function difference(
  target: NutrientAmount,
  planned: NutrientAmount,
  mode: "shortfall" | "surplus",
): NutrientAmount {
  const subtract = (targetValue: number, plannedValue: number) =>
    Math.max(
      mode === "shortfall"
        ? targetValue - plannedValue
        : plannedValue - targetValue,
      0,
    );
  return {
    carbohydratesG: subtract(target.carbohydratesG, planned.carbohydratesG),
    waterDeciliters: subtract(target.waterDeciliters, planned.waterDeciliters),
    sodiumMg: subtract(target.sodiumMg, planned.sodiumMg),
  };
}

export function compareNutrition(
  target: NutrientAmount,
  planned: NutrientAmount,
): NutrientComparison {
  const rawShortfall = difference(target, planned, "shortfall");
  const reportable = (value: number, tolerance: number): number =>
    value + EPSILON >= tolerance ? value : 0;
  return {
    target,
    planned,
    rawShortfall,
    reportableShortfall: {
      carbohydratesG: reportable(
        rawShortfall.carbohydratesG,
        SHORTFALL_TOLERANCE.carbohydratesG,
      ),
      waterDeciliters: reportable(
        rawShortfall.waterDeciliters,
        SHORTFALL_TOLERANCE.waterDeciliters,
      ),
      sodiumMg: reportable(rawShortfall.sodiumMg, SHORTFALL_TOLERANCE.sodiumMg),
    },
    surplus: difference(target, planned, "surplus"),
  };
}

export function hasReportableShortfall(
  comparison: NutrientComparison,
): boolean {
  const shortfall = comparison.reportableShortfall;
  return (
    shortfall.carbohydratesG > 0 ||
    shortfall.waterDeciliters > 0 ||
    shortfall.sodiumMg > 0
  );
}

export function segmentPlanning(
  plan: CalculatedPlan,
  assignments: NutritionAssignment[],
  options: NutritionOption[],
) {
  const byOption = new Map(options.map((option) => [option.id, option]));
  return plan.segments.map((segment) => {
    const segmentAssignments = assignments.filter(
      (assignment) => assignment.segmentId === segment.id,
    );
    const comparison = compareNutrition(
      nutritionTarget(segment.nutrition),
      plannedAmount(segmentAssignments, options),
    );
    const statuses: PlanningStatus[] = [
      hasReportableShortfall(comparison) ? "undercovered" : "covered",
    ];
    if (
      segmentAssignments.some(
        (assignment) => byOption.get(assignment.optionId)?.available === false,
      )
    )
      statuses.push("unavailable-option");
    return {
      segmentId: segment.id,
      assignments: segmentAssignments,
      comparison,
      statuses,
    };
  });
}

export function productTotals(assignments: NutritionAssignment[]) {
  const totals = new Map<string, number>();
  for (const assignment of assignments) {
    totals.set(
      assignment.optionId,
      (totals.get(assignment.optionId) ?? 0) + assignment.servings,
    );
  }
  return [...totals.entries()]
    .map(([optionId, servings]) => ({ optionId, servings }))
    .sort((left, right) => left.optionId.localeCompare(right.optionId));
}
