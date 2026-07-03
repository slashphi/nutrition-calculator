import type {
  NutritionAssignment,
  NutritionResult,
  SegmentId,
} from "../domain/model";

export type PlanningStatus = "covered" | "undercovered" | "unavailable-option";

export interface NutrientAmount {
  carbohydratesG: number;
  waterDeciliters: number;
  sodiumMg: number;
}

export interface NutrientComparison {
  target: NutrientAmount;
  planned: NutrientAmount;
  rawShortfall: NutrientAmount;
  reportableShortfall: NutrientAmount;
  surplus: NutrientAmount;
}

export interface PlanningSegmentInput {
  segmentId: SegmentId;
  target: NutritionResult;
}

export interface OptimizerInput {
  segments: PlanningSegmentInput[];
  options: Array<{
    id: string;
    carbohydratesG: number;
    waterDeciliters: number;
    sodiumMg: number;
  }>;
  deadlineMs: number;
}

export type OptimizerFailure =
  | { type: "timeout" }
  | { type: "cancelled" }
  | { type: "error"; message: string };

export type OptimizerResult =
  { type: "success"; assignments: NutritionAssignment[] } | OptimizerFailure;

export type { NutritionAssignment };
