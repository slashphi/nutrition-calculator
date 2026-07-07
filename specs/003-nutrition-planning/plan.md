# Nutrition Planning — Technical Implementation Plan

Status: Proposed  
Source specification: [spec.md](./spec.md)

## 1. Technical approach

Extend the existing React and TypeScript application with a pure planning
domain, a deterministic bounded optimizer, application-level catalogue state,
and inline segment-planning controls.

Keep nutrient arithmetic in integer base units:

- carbohydrates in whole grams;
- water in decilitres;
- sodium in whole milligrams; and
- servings as safe non-negative integers.

Convert the calculator's unrounded litre target to decilitres only when
comparing it with catalogue values. Apply shortfall tolerances to the raw
floating-point differences. Do not round calculator targets before comparison.

Run automatic optimization in a Web Worker so exhaustive search cannot block
the interface. The optimization core shall remain pure TypeScript and accept a
deadline through an injected clock, allowing deterministic unit tests without
a worker.

Do not add a production optimization dependency initially. The problem has
small integer dimensions, hard per-segment nutrient bounds, and a strict
lexicographic objective. A purpose-built branch-and-bound solver gives direct
control over determinism, timeout handling, and browser bundle size. Revisit a
solver dependency only if representative catalogue benchmarks cannot meet the
agreed runtime bound.

## 2. Proposed structure

```text
src/
  app/
    App.tsx
    appReducer.ts
    selectors.ts
  catalogue/
    catalogueState.ts
    model.ts
    parseCatalogueCsv.ts
  planning/
    model.ts
    nutritionTotals.ts
    tolerances.ts
    planningReducer.ts
    reconciliation.ts
    optimizer/
      model.ts
      compareCandidates.ts
      enumerateSegmentCandidates.ts
      optimizePlan.ts
      optimizer.worker.ts
      optimizerClient.ts
    NutritionPlanningView.tsx
    SegmentPlanningEditor.tsx
    PlanningSummary.tsx
    ProductSummary.tsx
  persistence/
    database.ts
    planRepository.ts
  i18n/
    en.ts
    de.ts
e2e/
  nutrition-planning.spec.ts
```

The dependency direction shall be:

```text
React UI → planning reducer/selectors → pure planning domain
React UI → optimizer client → Web Worker → pure optimizer
React UI → persistence repositories
planning reconciliation → race segment IDs + catalogue option IDs
```

## 3. State and identity

Extend the persisted race plan schema with nutrition assignments:

```ts
interface NutritionAssignment {
  segmentId: SegmentId;
  optionId: string;
  servings: number;
}

interface RacePlanV2 extends Omit<RacePlan, "schemaVersion"> {
  schemaVersion: 2;
  nutritionAssignments: NutritionAssignment[];
}
```

Store only references and quantities. Names and nutrient values remain
authoritative in the catalogue and shall not be copied into assignments.
Selectors shall join assignments to the current catalogue by option ID.

Enforce one assignment per `(segmentId, optionId)` pair. Reducer actions shall
add, replace, remove, merge, and clear assignments while preserving this
invariant. A serving count of zero dispatches removal. Reject fractional,
negative, non-finite, and unsafe counts at both UI and reducer boundaries.

Change standard catalogue IDs so they are deterministic from the complete
normalized product name and independent of CSV row number and catalogue
version. Use a stable encoded value or deterministic hash that cannot collide
silently; tests shall include names that produce identical simple slugs.
Nutrient changes with an unchanged normalized name retain identity. A standard
rename is a deletion plus addition because the current four-column CSV has no
separate persistent product key. Custom edits retain their generated UUID.

Lift catalogue lifecycle state from `NutritionCataloguePage` to the
application shell or a dedicated provider. Calculator, planner, and catalogue
maintenance must observe one authoritative in-memory catalogue and one
persistence lifecycle.

## 4. Derived planning calculations

Implement pure selectors that:

1. join valid assignments to catalogue options;
2. calculate planned nutrients per segment;
3. calculate raw shortfalls and surpluses from unrounded targets;
4. suppress shortfalls below 0.1 L water, 5 g carbohydrates, and 20 mg sodium;
5. derive covered, undercovered, and unavailable-option statuses;
6. aggregate overall planned nutrients and compare them with overall targets;
7. group serving counts by option ID for the product summary.

Use a small epsilon only to protect exact boundary comparisons from binary
floating-point representation. It must not create an additional business
tolerance. Add explicit tests immediately below, exactly at, and immediately
above every threshold.

Overall target comparisons shall use the calculator's unsegmented overall
result. Segment status shall always use that segment's target. The overall
summary shall separately indicate whether any segment is undercovered, even if
the overall totals are covered by surplus in another segment.

## 5. Automatic optimization

### 5.1 Candidate bounds

For each segment and nutrient, reject a candidate when:

```text
planned_nutrient > 2 × target_nutrient
```

Ignore options with zero contribution to all three nutrients. Every remaining
option has at least one positive nutrient and therefore receives a finite
per-segment count bound derived from the applicable doubled target. This makes
the search finite despite no explicit serving-count maximum.

Preprocess equivalent options carefully. Options with identical nutrients
cannot simply be collapsed because product variety and consecutive-use
objectives depend on their identities.

### 5.2 Segment enumeration

Use depth-first branch-and-bound to enumerate feasible whole-serving vectors
for each segment:

- order options deterministically;
- calculate maximum counts from remaining nutrient capacity;
- prune branches that cannot improve the current lexicographic nutrient bound;
- retain all candidates still relevant to later diversity objectives; and
- check the shared deadline regularly.

Calculate for each segment candidate:

- reportable water, carbohydrate, and sodium shortfalls;
- water, carbohydrate, and sodium surpluses;
- violation of the preferred maximum of two water-contributing option types;
- option-ID set; and
- total servings.

### 5.3 Complete-plan search

Combine segment candidates in course order. Compare complete plans exactly in
the specification's objective order:

1. summed reportable water shortfall;
2. summed reportable carbohydrate shortfall;
3. summed reportable sodium shortfall;
4. summed water surplus;
5. summed carbohydrate surplus;
6. summed sodium surplus;
7. number of segments using more than two water-contributing option types;
8. negative count of distinct option IDs in the complete plan;
9. repeated option uses across adjacent segments;
10. total servings; and
11. deterministic assignment order.

Use dynamic programming or branch-and-bound over course-ordered segment
candidates. The state needed for later objectives includes the set of product
IDs already used and the preceding segment's product set. Do not discard tied
nutrient-optimal candidates until their diversity impact has been evaluated.

Return either:

- a proven best complete plan;
- a proven best undercovered plan when complete coverage is infeasible; or
- a timeout/error result with no assignments.

The worker client shall install assignments atomically only for a successful
result. Timeout, worker failure, cancellation, or stale input shall leave the
current plan unchanged. Associate each request with the race targets,
segments, and catalogue revision; discard a response if any of them changed
while optimization was running.

Use a 10-second browser runtime deadline and verify it with representative
catalogue and multi-segment benchmark tests. The UI shall expose progress with
a visible indeterminate loading indicator, localized status text, and a
programmatic busy state, and shall allow cancellation.

## 6. Manual planning UI

Add a nutrition-planning section to the calculated segment result. Each segment
editor shall provide:

- an available-option selector;
- an add action;
- a compact selected-products group for assigned options;
- inline whole-serving controls for every assignment;
- immediate removal when the count becomes zero;
- an explicit remove action;
- option availability state;
- target, planned, signed delta, and scannable status indicators.

Do not offer unavailable options in the add selector. Keep assigned unavailable
options editable and visibly labelled. Delta severity shall be displayed as a
contained value treatment so warnings remain visible without visually
overpowering the comparison table. Use semantic fieldsets or labelled groups
so repeated controls and visual status indicators remain understandable to
screen readers.

Add complete-plan actions for automatic generation and clearing. Confirm only
when those actions would replace or remove existing assignments. Automatic
generation always operates on all segments.

Show overall nutrient comparison and a product summary containing one row per
assigned option and total servings only. Do not add a segment breakdown or
product nutrient totals to that summary.

## 7. Reconciliation

Reconcile assignments atomically whenever race segmentation or catalogue data
changes:

- unchanged segment IDs retain assignments;
- moving a station retains assignments when adjacent IDs remain unchanged;
- splitting a segment removes the old segment's assignments;
- combining two segments adds serving counts by option ID into the new segment;
- other removed segment IDs lose their assignments;
- deleted catalogue option IDs are removed silently from every segment;
- unavailable options retain assignments; and
- catalogue updates retaining an ID immediately affect all derived totals.

Segmentation commands know whether an operation is a split, combine, or
ordinary replacement. Pass this mutation metadata to reconciliation rather
than trying to infer every operation only from before/after ID sets.

Catalogue replacement shall reconcile against the final imported option-ID
set in the same state transition. Do not persist dangling assignments.

## 8. Persistence and migration

Upgrade the plan schema from version 1 to version 2 and default migrated plans
to an empty assignment list. Keep existing manual and GPX plan data intact.
Structurally validate each restored assignment and discard only invalid or
dangling entries.

Retain assignments while the calculator is temporarily invalid. Derived
planning selectors and editing are disabled until calculation becomes valid.

Reuse the existing debounced save and `pagehide` flush. Catalogue and plan
state must finish initialization before reconciliation so startup does not
mistake not-yet-loaded catalogue entries for deletions.

On storage failure, continue with in-memory state and the existing localized
storage warning behavior.

## 9. Localization, responsive behavior, and accessibility

Add typed German and English messages for planner actions, busy/error states,
confirmation text, nutrient comparisons, tolerances, availability, and
segment statuses.

Use the existing responsive segment presentation. On narrow screens, stack
assignment controls and nutrient comparisons without page-level horizontal
overflow. Announce automatic-planning completion/failure, assignment removal
caused by reconciliation, and status changes through appropriate live regions.
Do not rely on colour for covered, undercovered, surplus, or unavailable
states.

Focus shall remain predictable after adding/removing an inline assignment and
after confirmations. While the optimizer is running, show a visible
indeterminate loader with localized status text, expose `aria-busy`, and
prevent duplicate generation requests. Do not rely on loader animation alone
to communicate progress.

## 10. Testing strategy

### Unit tests

Cover:

- assignment validation and reducer invariants;
- integer nutrient totals and grouping;
- all tolerance boundaries;
- overall versus per-segment status;
- stable standard IDs and collision cases;
- split, combine, move, catalogue-update, unavailability, and deletion
  reconciliation;
- every optimizer comparison level;
- surplus-bound pruning;
- infeasible undercovered results;
- variety and adjacent-segment preference;
- two-water-product soft preference;
- deterministic ties;
- timeout and cancellation; and
- representative multi-segment performance.

Use exhaustive brute force on very small generated catalogues as a test oracle
for the optimized solver.

### Component tests

Cover inline add/edit/remove, zero removal, unavailable-option behavior,
immediate recalculation, segment statuses, summaries, clear confirmation,
automatic replacement confirmation, busy state, timeout/error preservation,
language switching, focus behavior, and storage warnings.

### Persistence tests

Cover schema-v1 migration, schema-v2 round trips, invalid assignment recovery,
temporary calculator invalidity, startup ordering with catalogue restoration,
and storage failure.

### End-to-end tests

Cover manual multi-segment planning, automatic generation and replacement,
undercoverage, catalogue availability/edit/delete effects, segment
split/combine/move effects, refresh restoration, language preservation,
keyboard use, mobile no-overflow, cancellation/failure behavior, and absence
of runtime network requests.

## 11. Delivery constraints

- Preserve all existing calculator and catalogue behavior and stored data.
- Keep optimization, GPX processing, planning, and persistence local.
- Do not install partial automatic results.
- Keep solver output deterministic for identical ordered input.
- Do not introduce a production dependency without recording benchmark
  evidence and the tradeoff.
- Run formatting, type checking, linting, unit/component tests, production
  build, Playwright tests, and the existing smoke test before completion.
