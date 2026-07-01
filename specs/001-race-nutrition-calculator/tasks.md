# Race Nutrition Calculator — Task Breakdown

Status: Proposed  
Implementation plan: [plan.md](./plan.md)

Tasks are ordered by dependency. Each task should leave the repository passing all checks introduced up to that point.

## Phase 1 — Project foundation

- [x] **T001** Initialize a Vite React TypeScript project with strict TypeScript settings and a committed lockfile.
- [x] **T002** Add formatting, linting, type-checking, unit-test, component-test, end-to-end-test, and production-build scripts.
- [x] **T003** Configure Vitest, Testing Library, and Playwright with shared test fixtures.
- [x] **T004** Add global CSS tokens, responsive page shell, semantic landmarks, and visible focus styles.
- [x] **T005** Add typed English and German dictionaries, browser-language detection, fallback to English, number/unit formatters, and a preserving language switch. Covers AC-13.
- [x] **T006** Add the CI workflow for type checking, linting, tests, and production build.

## Phase 2 — Domain model and calculations

- [x] **T007** Define race plan, course, station, segment, nutrition-result, and validation types.
- [x] **T008** Implement course-effort and nutrition calculations using unrounded internal values.
- [x] **T009** Implement display rounding and localized unit formatting.
- [x] **T010** Add formula, boundary, rounding, and descent-exclusion unit tests. Covers AC-1, AC-2, and AC-3.
- [x] **T011** Implement `HH:mm` parsing/formatting with support for durations over 24 hours.
- [x] **T012** Implement effort-weighted segment-time allocation, nearest-minute rounding, and Finish-segment remainder correction.
- [x] **T013** Implement segment-time overrides, derived total duration, and explicit new-total reset.
- [x] **T014** Add time allocation and override unit tests. Covers AC-5 and AC-6.
- [x] **T015** Implement structured field and plan validation, including all numeric boundaries and incomplete states.

## Phase 3 — GPX processing

- [x] **T016** Create valid track, valid route, namespaced, malformed, missing-elevation, multi-track, multi-route, and multi-segment GPX fixtures.
- [x] **T017** Implement native XML parsing and structural validation for exactly one track/track-segment or one route.
- [x] **T018** Implement coordinate/elevation validation and structured GPX error codes.
- [x] **T019** Implement haversine cumulative distance and raw elevation gain/loss accumulation.
- [x] **T020** Implement station-boundary interpolation and course segmentation at race kilometres.
- [x] **T021** Add GPX parser, geometry, rejection, and interpolation tests. Covers AC-7 and AC-8.
- [x] **T022** Add GPX file selection, loading state, localized errors, replacement, and removal UI.
- [x] **T023** Add a representative large-file performance test and record an acceptable browser parsing threshold.

## Phase 4 — Manual course and aid stations

- [x] **T024** Build manual distance/ascent/descent input and the initial Start-to-Finish segment.
- [x] **T025** Implement station validation, stable IDs, sorting, editable names, water-only state, and default-name renumbering.
- [x] **T026** Implement transactional manual segment splitting with required geometry for both resulting segments.
- [x] **T027** Implement manual station deletion by merging adjacent segment geometry and time.
- [x] **T028** Implement manual station movement with replacement geometry for both affected segments.
- [x] **T029** Implement GPX station insertion/movement/deletion and affected time recalculation.
- [x] **T030** Build responsive aid-station editing UI for add, edit, and delete operations.
- [x] **T031** Add manual and GPX station integration tests. Covers AC-7, AC-9, and AC-10.

## Phase 5 — Application workflow and results

- [x] **T032** Implement the reducer, actions, derived selectors, defaults, and immediate recalculation flow.
- [x] **T033** Build required race name, weight, intake factor, and expected finishing-time inputs with localized inline validation.
- [x] **T034** Build course-mode selection and preserve unrelated valid inputs when replacing/removing course data.
- [x] **T035** Build the race summary and overall nutrition result components.
- [x] **T036** Build the responsive segment plan with from/to, geometry, duration, nutrition, and water-only destination indication.
- [x] **T037** Add the visible localized planning/medical disclaimer.
- [x] **T038** Add workflow and result component tests. Covers AC-4, AC-11, and AC-12.

## Phase 6 — Persistence and privacy

- [x] **T039** Implement versioned IndexedDB schema for plans and processed GPX courses.
- [x] **T040** Implement debounced valid-state saves and a `pagehide` flush.
- [ ] **T041** Implement startup restoration, schema migration hooks, partial invalid-state recovery, and localized recovery notice.
- [x] **T042** Handle unavailable/full browser storage without blocking the in-memory calculator.
- [x] **T043** Add persistence tests for manual and GPX plans, including refresh without file reselection. Covers AC-14.
- [x] **T044** Audit application code and built assets for runtime network requests; add a Playwright assertion that plan workflows make none. Covers AC-15.

## Phase 7 — Accessibility, mobile, and end-to-end verification

- [x] **T045** Add ARIA live announcements for GPX/status errors and ensure every input has an accessible name and associated error.
- [ ] **T046** Verify keyboard-only station editing, language switching, mode switching, and time overrides.
- [x] **T047** Add manual reference-scenario end-to-end test.
- [x] **T048** Add GPX upload/segmentation and invalid-GPX end-to-end tests.
- [x] **T049** Add time override/reset, language preservation, and persistence end-to-end tests.
- [x] **T050** Add mobile viewport end-to-end tests and horizontal-overflow assertion. Covers AC-16.
- [ ] **T051** Run an accessibility audit and resolve critical or serious findings.

## Phase 8 — Deployment and release

- [x] **T052** Configure Vite for the `/nutrition-calculator/` GitHub Pages base path.
- [x] **T053** Add the GitHub Pages build-and-deploy workflow with required permissions, environment, and concurrency control.
- [x] **T054** Add a production-build smoke test that loads built assets under the repository base path.
- [x] **T055** Complete traceability review: map AC-1 through AC-16 to passing automated tests or documented manual checks.
- [ ] **T056** Perform final German and English content review, mobile verification, and privacy check.
- [ ] **T057** Enable GitHub Pages with GitHub Actions as its source and verify the deployed application.

## Suggested delivery slices

1. **Calculation core:** T001–T015.
2. **GPX course support:** T016–T023.
3. **Course planning UI:** T024–T038.
4. **Durable, production-ready app:** T039–T057.
