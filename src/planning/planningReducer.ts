import type { NutritionAssignment } from "../domain/model";

export type PlanningAction =
  | {
      type: "set";
      segmentId: string;
      optionId: string;
      servings: number;
    }
  | { type: "remove"; segmentId: string; optionId: string }
  | { type: "clear" }
  | { type: "replace"; assignments: NutritionAssignment[] };

export function isValidServingCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function normalizeAssignments(
  assignments: NutritionAssignment[],
): NutritionAssignment[] {
  const normalized = new Map<string, NutritionAssignment>();
  for (const assignment of assignments) {
    if (
      !assignment.segmentId ||
      !assignment.optionId ||
      !isValidServingCount(assignment.servings) ||
      assignment.servings === 0
    )
      continue;
    normalized.set(
      `${assignment.segmentId}\u0000${assignment.optionId}`,
      assignment,
    );
  }
  return [...normalized.values()];
}

export function planningReducer(
  state: NutritionAssignment[],
  action: PlanningAction,
): NutritionAssignment[] {
  switch (action.type) {
    case "set": {
      if (!isValidServingCount(action.servings)) return state;
      const remaining = state.filter(
        (assignment) =>
          assignment.segmentId !== action.segmentId ||
          assignment.optionId !== action.optionId,
      );
      if (action.servings === 0) return remaining;
      return [
        ...remaining,
        {
          segmentId: action.segmentId,
          optionId: action.optionId,
          servings: action.servings,
        },
      ];
    }
    case "remove":
      return state.filter(
        (assignment) =>
          assignment.segmentId !== action.segmentId ||
          assignment.optionId !== action.optionId,
      );
    case "clear":
      return [];
    case "replace":
      return normalizeAssignments(action.assignments);
  }
}
