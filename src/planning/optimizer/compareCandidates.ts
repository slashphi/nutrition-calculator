export type Objective = [
  waterShortfall: number,
  carbohydrateShortfall: number,
  sodiumShortfall: number,
  waterSurplus: number,
  carbohydrateSurplus: number,
  sodiumSurplus: number,
  waterOptionViolations: number,
  negativeDistinctOptions: number,
  consecutiveRepeats: number,
  servings: number,
  deterministicOrder: string,
];

export function compareObjectives(left: Objective, right: Objective): number {
  for (let index = 0; index < left.length - 1; index += 1) {
    const difference = (left[index] as number) - (right[index] as number);
    if (difference !== 0) return difference;
  }
  return left[10].localeCompare(right[10]);
}
