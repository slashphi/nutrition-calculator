# Nutrition Planning — Task Breakdown

Status: T001–T043 implemented; T044–T050 verification pending  
Implementation plan: [plan.md](./plan.md)

Tasks are ordered by dependency. Each task shall leave all checks introduced up
to that point passing.

## Phase 1 — Identity, model, and migration foundation

- [ ] **T001** Replace row/version-dependent standard-option IDs with stable,
      collision-safe IDs derived from the complete normalized name.
- [ ] **T002** Add catalogue parser and lifecycle tests proving ID stability
      across row movement, catalogue versions, and nutrient changes, plus
      collision handling for names with identical simple slugs.
- [ ] **T003** Define nutrition-assignment, planning-status, nutrient-comparison,
      optimizer-input/output, and structured failure types.
- [ ] **T004** Extend the race-plan schema to version 2 with nutrition
      assignments and migrate version-1 plans to an empty assignment list.
- [ ] **T005** Add structural restoration validation that discards invalid or
      dangling assignments individually without invalidating the race plan.
- [ ] **T006** Add migration and persistence tests for manual and GPX plans,
      schema-v2 round trips, partial assignment recovery, and storage failure.

## Phase 2 — Planning domain and reconciliation

- [ ] **T007** Implement safe whole-serving validation and reducer actions for
      add, replace, zero/remove, explicit remove, clear, and atomic replacement.
- [ ] **T008** Implement pure per-segment and overall planned nutrient totals
      joined against current catalogue data.
- [ ] **T009** Implement raw shortfall, surplus, and suppression thresholds of
      0.1 L water, 5 g carbohydrates, and 20 mg sodium.
- [ ] **T010** Implement covered, undercovered, and unavailable-option status
      selectors plus grouped complete-course serving totals by option.
- [ ] **T011** Add planning-domain tests for safe-integer boundaries, duplicate
      prevention, exact totals, threshold boundaries, statuses, and summaries.
      Covers AC-1, AC-2, and AC-7.
- [ ] **T012** Implement reconciliation primitives for retained, removed,
      split, combined, and newly added segment IDs.
- [ ] **T013** Integrate reconciliation with manual and GPX station add, move,
      delete, course replacement, and course-mode changes.
- [ ] **T014** Implement catalogue reconciliation for option update,
      unavailability, deletion, and full catalogue replacement.
- [ ] **T015** Add reconciliation tests for station split deletion, station
      combine quantity merging, station movement retention, unavailable
      retention, option updates, and silent option deletion. Covers AC-5,
      AC-6, and AC-8.

## Phase 3 — Catalogue lifecycle integration

- [ ] **T016** Lift catalogue state and initialization from the maintenance page
      into a shared application-level owner without changing catalogue UX.
- [ ] **T017** Sequence plan and catalogue restoration so reconciliation runs
      only after both stores have initialized.
- [ ] **T018** Preserve catalogue view preferences and all existing automatic
      and manual reload behavior through the state-lifecycle refactor.
- [ ] **T019** Add application integration tests for shared catalogue updates,
      startup ordering, reload reconciliation, and storage-warning behavior.

## Phase 4 — Exact bounded optimizer

- [ ] **T020** Implement deterministic lexicographic comparison for all eleven
      objective levels in the specified order.
- [ ] **T021** Implement automatic candidate validation with whole servings,
      available options only, exclusion of zero-contribution options, and the
      hard `planned <= 2 × target` constraint per nutrient and segment.
- [ ] **T022** Implement finite per-option count bounds and deterministic
      branch-and-bound enumeration of segment candidates.
- [ ] **T023** Implement complete-plan search across course-ordered segment
      candidates with global distinct-option and adjacent-repeat state.
- [ ] **T024** Implement the per-segment soft preference for no more than two
      distinct water-contributing options.
- [ ] **T025** Implement proven-best covered and undercovered results,
      deterministic tie-breaking, deadline checks, and structured timeout and
      cancellation failures.
- [ ] **T026** Add brute-force oracle tests on small catalogues covering every
      objective level, infeasible coverage, surplus caps, global optimization,
      diversity, water-option preference, and deterministic results. Covers
      AC-3.
- [ ] **T027** Add representative large-catalogue/multi-segment benchmarks,
      choose and document the browser runtime deadline, and verify clean abort
      within that bound.
- [ ] **T028** Wrap the optimizer in a Web Worker with request revisions,
      cancellation, stale-result rejection, and atomic successful installation.
- [ ] **T029** Add worker-client tests proving timeout, failure, cancellation,
      and stale responses leave existing assignments unchanged. Covers AC-4.

## Phase 5 — Inline planning UI

- [ ] **T030** Add typed German and English planning actions, validation,
      confirmation, status, tolerance, availability, busy, and failure messages.
- [ ] **T031** Build inline segment option selection using only currently
      available catalogue options.
- [ ] **T032** Build inline safe-whole-serving editing, immediate zero removal,
      explicit removal, and editable unavailable assignments.
- [ ] **T033** Display per-segment targets, planned totals, reportable
      shortfalls, surpluses, and combined text statuses.
- [ ] **T034** Build overall target/planned/shortfall/surplus status and the
      serving-count-only product summary.
- [ ] **T035** Add clear-all confirmation that removes all assignments and
      planning-specific state.
- [ ] **T036** Add automatic-plan confirmation, indeterminate busy state,
      cancellation, successful replacement, undercoverage result, and
      non-destructive failure handling.
- [ ] **T037** Disable planning calculations and editing while the race plan is
      invalid while retaining stored assignments.
- [ ] **T038** Add component tests for inline workflows, zero removal,
      availability, immediate totals, statuses, summaries, confirmations,
      optimizer outcomes, focus, and language preservation. Covers AC-1
      through AC-7 and AC-10.

## Phase 6 — Persistence, accessibility, and responsive behavior

- [ ] **T039** Integrate nutrition assignments with debounced saves and the
      `pagehide` flush while preserving in-memory operation on storage failure.
- [ ] **T040** Add localized live announcements for optimizer completion or
      failure and assignment removal caused by reconciliation.
- [ ] **T041** Make repeated segment controls keyboard operable with unique
      accessible names, predictable focus after mutation, visible focus, and
      `aria-busy` during optimization.
- [ ] **T042** Add responsive mobile planning layouts without page-level
      horizontal overflow or duplicate assistive-technology content.
- [ ] **T043** Add persistence, accessibility, and responsive component tests.
      Covers AC-9 and AC-10.

## Phase 7 — End-to-end verification

- [ ] **T044** Add an end-to-end manual multi-segment assignment/edit/remove,
      status, product-summary, and refresh-restoration workflow.
- [ ] **T045** Add automatic planning, replacement confirmation, diversity,
      undercoverage, and timeout/cancellation end-to-end coverage.
- [ ] **T046** Add catalogue availability, custom edit/delete, and catalogue
      replacement effects on existing-plan end-to-end coverage.
- [ ] **T047** Add station split, combine, and movement effects on assignments
      to manual and GPX end-to-end coverage.
- [ ] **T048** Add German/English preservation, keyboard-only operation, mobile
      no-overflow, and status-perceivability coverage.
- [ ] **T049** Extend runtime network assertions to manual and automatic
      nutrition-planning workflows.
- [ ] **T050** Run the full repository check, production-build smoke test, and
      Playwright suite; complete an AC-1 through AC-10 traceability matrix and
      record any required manual browser verification.

## Suggested delivery slices

1. **Durable planning model:** T001–T019.
2. **Automatic planning engine:** T020–T029.
3. **Usable manual and automatic planner:** T030–T043.
4. **Release verification:** T044–T050.
