import type { NutritionAssignment } from "../domain/model";
import { normalizeAssignments } from "./planningReducer";

export function retainSegments(
  assignments: NutritionAssignment[],
  validSegmentIds: Set<string>,
): NutritionAssignment[] {
  return assignments.filter((assignment) =>
    validSegmentIds.has(assignment.segmentId),
  );
}

export function splitSegment(
  assignments: NutritionAssignment[],
  removedSegmentId: string,
): NutritionAssignment[] {
  return assignments.filter(
    (assignment) => assignment.segmentId !== removedSegmentId,
  );
}

export function combineSegments(
  assignments: NutritionAssignment[],
  removedSegmentIds: [string, string],
  combinedSegmentId: string,
): NutritionAssignment[] {
  const counts = new Map<string, number>();
  const retained: NutritionAssignment[] = [];
  for (const assignment of assignments) {
    if (removedSegmentIds.includes(assignment.segmentId)) {
      counts.set(
        assignment.optionId,
        (counts.get(assignment.optionId) ?? 0) + assignment.servings,
      );
    } else {
      retained.push(assignment);
    }
  }
  return normalizeAssignments([
    ...retained,
    ...[...counts].map(([optionId, servings]) => ({
      segmentId: combinedSegmentId,
      optionId,
      servings,
    })),
  ]);
}

export function reconcileCatalogue(
  assignments: NutritionAssignment[],
  optionIds: Set<string>,
): NutritionAssignment[] {
  return assignments.filter((assignment) => optionIds.has(assignment.optionId));
}
