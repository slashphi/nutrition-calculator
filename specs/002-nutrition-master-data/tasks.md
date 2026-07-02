# Nutrition Master Data — Task Breakdown

Status: Proposed  
Implementation plan: [plan.md](./plan.md)

Tasks are ordered by dependency. Each task shall leave all checks introduced up
to that point passing.

## Phase 1 — Catalogue domain and bundled data

- [ ] **T001** Add the agreed semicolon-delimited standard catalogue CSV,
  explicit catalogue version, and content/version consistency test.
- [ ] **T002** Define nutrition-option, catalogue, view-state, import-issue, and
  validation types.
- [ ] **T003** Implement name normalization and non-negative safe-number
  validation for whole-number nutrients and 0.1 L water increments.
- [ ] **T004** Implement sodium/salt entry validation and nearest-whole-mg salt
  conversion.
- [ ] **T005** Implement CSV parsing, exact header validation, invalid-row
  reporting, and silent first-row-wins duplicate handling.
- [ ] **T006** Add domain and parser tests covering numeric boundaries,
  conversion, names, CSV variants, invalid rows, and duplicates. Covers AC-1,
  AC-2, AC-4, and AC-5.

## Phase 2 — Catalogue state and list behavior

- [ ] **T007** Implement catalogue reducer actions for initialization, create,
  edit, delete, availability, and replacement with invariant enforcement.
- [ ] **T008** Implement search, source/availability filters, stable sorting,
  fixed 20-item pagination, page reset, and page clamping selectors.
- [ ] **T009** Add reducer and selector tests for permissions, duplicate
  prevention, filter combinations, every sortable column, pagination, and
  replacement. Covers AC-3, AC-6, AC-7, AC-8, AC-10, and AC-11.

## Phase 3 — Persistence and lifecycle

- [ ] **T010** Upgrade the IndexedDB schema without disturbing existing plans
  and add independent catalogue and view-preference persistence.
- [ ] **T011** Implement initial CSV setup and structurally validated catalogue
  restoration.
- [ ] **T012** Implement automatic bundled-version replacement, including
  custom-option deletion, availability reset, preserved view state, and notice.
- [ ] **T013** Implement manual reload with identical replacement semantics.
- [ ] **T014** Add debounced saves, `pagehide` flush, and non-blocking in-memory
  fallback on storage errors.
- [ ] **T015** Add persistence tests for initialization, restoration, both
  reload paths, partial recovery, destructive replacement, view persistence,
  and storage failure. Covers AC-8, AC-9, AC-11, and AC-12.

## Phase 4 — Navigation and catalogue list UI

- [ ] **T016** Refactor the application shell to provide accessible top-level
  calculator/catalogue navigation while preserving language and calculator
  state.
- [ ] **T017** Add typed German and English catalogue, validation, confirmation,
  warning, status, source, and availability messages.
- [ ] **T018** Build the catalogue page with name search, source and
  availability filters, sortable desktop table, and 20-item pagination.
- [ ] **T019** Build the responsive mobile card presentation without duplicate
  assistive-technology content or horizontal page overflow.
- [ ] **T020** Add availability controls for both sources and omit standard edit
  and delete actions.
- [ ] **T021** Add navigation/list component tests. Covers AC-6, AC-10, AC-11,
  AC-13, and AC-14.

## Phase 5 — Maintenance dialogs

- [ ] **T022** Build a reusable accessible dialog wrapper with initial focus,
  focus containment, Escape handling, and return focus.
- [ ] **T023** Build the custom add/edit dialog with inline validation,
  sodium/salt selector, live sodium preview, and successful close/status flow.
- [ ] **T024** Build custom deletion confirmation with permanent removal.
- [ ] **T025** Build destructive catalogue-reload confirmation and completion
  status.
- [ ] **T026** Surface localized CSV row warnings, version-reload notices,
  recovery notices, and storage warnings.
- [ ] **T027** Add dialog and notice component tests. Covers AC-2 through AC-9,
  AC-12, AC-13, and AC-14.

## Phase 6 — End-to-end verification

- [ ] **T028** Add an end-to-end custom-option add/edit/availability/delete
  workflow using sodium and salt entry.
- [ ] **T029** Add search/filter/sort/pagination and refresh-persistence
  end-to-end coverage.
- [ ] **T030** Add manual and automatic reload end-to-end coverage.
- [ ] **T031** Add German/English preservation and mobile no-overflow coverage.
- [ ] **T032** Verify keyboard-only navigation, maintenance dialogs,
  confirmations, availability, filtering, sorting, and pagination.
- [ ] **T033** Extend the runtime network assertion to catalogue workflows.
- [ ] **T034** Run the full repository check and production-build smoke test,
  then complete the traceability matrix.

## Suggested delivery slices

1. **Data foundation:** T001–T006.
2. **State and persistence:** T007–T015.
3. **Usable catalogue:** T016–T027.
4. **Release verification:** T028–T034.

