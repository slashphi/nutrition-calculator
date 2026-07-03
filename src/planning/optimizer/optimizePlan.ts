import type { NutritionAssignment } from "../../domain/model";
import type { NutrientAmount, OptimizerInput, OptimizerResult } from "../model";
import { compareNutrition, nutritionTarget } from "../nutritionTotals";
import { compareObjectives, type Objective } from "./compareCandidates";

interface SegmentCandidate {
  assignments: NutritionAssignment[];
  amount: NutrientAmount;
  objective: Objective;
  optionIds: Set<string>;
}

interface Controls {
  now?: () => number;
  cancelled?: () => boolean;
}

class StopOptimization extends Error {
  constructor(readonly reason: "timeout" | "cancelled") {
    super(reason);
  }
}

function check(deadline: number, controls: Required<Controls>) {
  if (controls.cancelled()) throw new StopOptimization("cancelled");
  if (controls.now() >= deadline) throw new StopOptimization("timeout");
}

function segmentCandidates(
  segmentId: string,
  target: NutrientAmount,
  options: OptimizerInput["options"],
  deadline: number,
  controls: Required<Controls>,
): SegmentCandidate[] {
  const candidates: SegmentCandidate[] = [];
  const assignments: NutritionAssignment[] = [];
  const amount: NutrientAmount = {
    carbohydratesG: 0,
    waterDeciliters: 0,
    sodiumMg: 0,
  };

  function visit(index: number) {
    check(deadline, controls);
    if (index === options.length) {
      const comparison = compareNutrition(target, { ...amount });
      const optionIds = new Set(assignments.map((item) => item.optionId));
      const waterOptions = assignments.filter((assignment) => {
        const option = options.find((item) => item.id === assignment.optionId);
        return (option?.waterDeciliters ?? 0) > 0;
      }).length;
      const objective: Objective = [
        comparison.reportableShortfall.waterDeciliters,
        comparison.reportableShortfall.carbohydratesG,
        comparison.reportableShortfall.sodiumMg,
        comparison.surplus.waterDeciliters,
        comparison.surplus.carbohydratesG,
        comparison.surplus.sodiumMg,
        waterOptions > 2 ? 1 : 0,
        -optionIds.size,
        0,
        assignments.reduce((sum, item) => sum + item.servings, 0),
        assignments
          .map((item) => `${item.optionId}:${item.servings}`)
          .join("|"),
      ];
      candidates.push({
        assignments: assignments.map((item) => ({ ...item })),
        amount: { ...amount },
        objective,
        optionIds,
      });
      return;
    }

    const option = options[index]!;
    const limits = [
      option.carbohydratesG > 0
        ? Math.floor(
            (2 * target.carbohydratesG - amount.carbohydratesG) /
              option.carbohydratesG,
          )
        : Number.POSITIVE_INFINITY,
      option.waterDeciliters > 0
        ? Math.floor(
            (2 * target.waterDeciliters - amount.waterDeciliters) /
              option.waterDeciliters,
          )
        : Number.POSITIVE_INFINITY,
      option.sodiumMg > 0
        ? Math.floor((2 * target.sodiumMg - amount.sodiumMg) / option.sodiumMg)
        : Number.POSITIVE_INFINITY,
    ];
    const maximum = Math.max(0, Math.min(...limits));
    for (let servings = 0; servings <= maximum; servings += 1) {
      if (servings > 0)
        assignments.push({
          segmentId,
          optionId: option.id,
          servings,
        });
      amount.carbohydratesG += servings * option.carbohydratesG;
      amount.waterDeciliters += servings * option.waterDeciliters;
      amount.sodiumMg += servings * option.sodiumMg;
      visit(index + 1);
      amount.carbohydratesG -= servings * option.carbohydratesG;
      amount.waterDeciliters -= servings * option.waterDeciliters;
      amount.sodiumMg -= servings * option.sodiumMg;
      if (servings > 0) assignments.pop();
    }
  }

  visit(0);
  return candidates;
}

function completeObjective(candidates: SegmentCandidate[]): Objective {
  const used = new Set<string>();
  let consecutiveRepeats = 0;
  for (const [index, candidate] of candidates.entries()) {
    candidate.optionIds.forEach((id) => used.add(id));
    if (index > 0) {
      const previous = candidates[index - 1]!.optionIds;
      consecutiveRepeats += [...candidate.optionIds].filter((id) =>
        previous.has(id),
      ).length;
    }
  }
  const sum = (position: number) =>
    candidates.reduce(
      (total, candidate) => total + (candidate.objective[position] as number),
      0,
    );
  const assignments = candidates.flatMap((candidate) => candidate.assignments);
  return [
    sum(0),
    sum(1),
    sum(2),
    sum(3),
    sum(4),
    sum(5),
    sum(6),
    -used.size,
    consecutiveRepeats,
    sum(9),
    assignments
      .map(
        (assignment) =>
          `${assignment.segmentId}:${assignment.optionId}:${assignment.servings}`,
      )
      .join("|"),
  ];
}

export function optimizePlan(
  input: OptimizerInput,
  suppliedControls: Controls = {},
): OptimizerResult {
  const controls: Required<Controls> = {
    now: suppliedControls.now ?? (() => performance.now()),
    cancelled: suppliedControls.cancelled ?? (() => false),
  };
  const deadline = controls.now() + input.deadlineMs;
  try {
    const options = input.options
      .filter(
        (option) =>
          option.carbohydratesG > 0 ||
          option.waterDeciliters > 0 ||
          option.sodiumMg > 0,
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const perSegment = input.segments.map((segment) =>
      segmentCandidates(
        segment.segmentId,
        nutritionTarget(segment.target),
        options,
        deadline,
        controls,
      ),
    );
    let best:
      { candidates: SegmentCandidate[]; objective: Objective } | undefined;
    const selected: SegmentCandidate[] = [];
    function combine(index: number) {
      check(deadline, controls);
      if (index === perSegment.length) {
        const objective = completeObjective(selected);
        if (!best || compareObjectives(objective, best.objective) < 0)
          best = { candidates: [...selected], objective };
        return;
      }
      for (const candidate of perSegment[index]!) {
        selected.push(candidate);
        combine(index + 1);
        selected.pop();
      }
    }
    combine(0);
    return {
      type: "success",
      assignments:
        best?.candidates.flatMap((candidate) => candidate.assignments) ?? [],
    };
  } catch (error) {
    if (error instanceof StopOptimization) return { type: error.reason };
    return {
      type: "error",
      message: error instanceof Error ? error.message : "optimizer.error",
    };
  }
}
