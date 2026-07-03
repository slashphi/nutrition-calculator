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
  interface State {
    assignments: NutritionAssignment[];
    amount: NutrientAmount;
    waterOptionCount: number;
  }

  const assignmentOrder = (state: State) =>
    state.assignments
      .map((item) => `${item.optionId}:${item.servings}`)
      .join("|");
  const servingCount = (state: State) =>
    state.assignments.reduce((sum, item) => sum + item.servings, 0);
  const compareStates = (left: State, right: State) =>
    right.assignments.length - left.assignments.length ||
    servingCount(left) - servingCount(right) ||
    assignmentOrder(left).localeCompare(assignmentOrder(right));
  const stateKey = (state: State) =>
    `${state.amount.carbohydratesG}:${state.amount.waterDeciliters}:${state.amount.sodiumMg}:${Math.min(state.waterOptionCount, 3)}`;
  const stateObjective = (state: State): Objective => {
    const comparison = compareNutrition(target, state.amount);
    return [
      comparison.reportableShortfall.waterDeciliters,
      comparison.reportableShortfall.carbohydratesG,
      comparison.reportableShortfall.sodiumMg,
      comparison.surplus.waterDeciliters,
      comparison.surplus.carbohydratesG,
      comparison.surplus.sodiumMg,
      state.waterOptionCount > 2 ? 1 : 0,
      -state.assignments.length,
      0,
      servingCount(state),
      assignmentOrder(state),
    ];
  };

  let states = new Map<string, State[]>([
    [
      "0:0:0:0",
      [
        {
          assignments: [],
          amount: { carbohydratesG: 0, waterDeciliters: 0, sodiumMg: 0 },
          waterOptionCount: 0,
        },
      ],
    ],
  ]);

  for (const option of options) {
    const next = new Map<string, State[]>();
    for (const alternatives of states.values()) {
      for (const state of alternatives) {
        check(deadline, controls);
        const limits = [
          option.carbohydratesG > 0
            ? Math.floor(
                (2 * target.carbohydratesG - state.amount.carbohydratesG) /
                  option.carbohydratesG,
              )
            : Number.POSITIVE_INFINITY,
          option.waterDeciliters > 0
            ? Math.floor(
                (2 * target.waterDeciliters - state.amount.waterDeciliters) /
                  option.waterDeciliters,
              )
            : Number.POSITIVE_INFINITY,
          option.sodiumMg > 0
            ? Math.floor(
                (2 * target.sodiumMg - state.amount.sodiumMg) / option.sodiumMg,
              )
            : Number.POSITIVE_INFINITY,
        ];
        const maximum = Math.max(0, Math.min(...limits));
        for (let servings = 0; servings <= maximum; servings += 1) {
          const amount = {
            carbohydratesG:
              state.amount.carbohydratesG + servings * option.carbohydratesG,
            waterDeciliters:
              state.amount.waterDeciliters + servings * option.waterDeciliters,
            sodiumMg: state.amount.sodiumMg + servings * option.sodiumMg,
          };
          const waterOptionCount =
            state.waterOptionCount +
            (servings > 0 && option.waterDeciliters > 0 ? 1 : 0);
          const assignments =
            servings === 0
              ? state.assignments
              : [
                  ...state.assignments,
                  { segmentId, optionId: option.id, servings },
                ];
          const key = `${amount.carbohydratesG}:${amount.waterDeciliters}:${amount.sodiumMg}:${Math.min(waterOptionCount, 3)}`;
          const alternatives = next.get(key) ?? [];
          alternatives.push({ assignments, amount, waterOptionCount });
          next.set(key, alternatives);
        }
      }
    }
    const retained = [...next.values()].flatMap((alternatives) =>
      alternatives.sort(compareStates).slice(0, 4),
    );
    if (retained.length > 2_000)
      retained.sort((left, right) =>
        compareObjectives(stateObjective(left), stateObjective(right)),
      );
    states = new Map();
    for (const state of retained.slice(0, 2_000)) {
      const key = stateKey(state);
      const alternatives = states.get(key) ?? [];
      alternatives.push(state);
      states.set(key, alternatives);
    }
  }

  return [...states.values()].flatMap((alternatives) =>
    alternatives.map((state) => {
      const optionIds = new Set(state.assignments.map((item) => item.optionId));
      return {
        assignments: state.assignments,
        amount: state.amount,
        objective: stateObjective(state),
        optionIds,
      };
    }),
  );
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
