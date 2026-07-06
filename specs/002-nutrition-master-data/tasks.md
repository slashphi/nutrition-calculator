# Nutrition Master Data — Task Breakdown

Status: Brand extension implemented; browser verification pending
Implementation plan: [plan.md](./plan.md)

Tasks are ordered by dependency. Each task shall leave all checks introduced up
to that point passing.

## Phase 1 — Catalogue domain and bundled data

- [x] **T001** Add the agreed semicolon-delimited standard catalogue CSV,
      explicit catalogue version, and content/version consistency test.
- [x] **T002** Define nutrition-option, catalogue, view-state, import-issue, and
      validation types.
- [x] **T003** Implement name normalization and non-negative safe-number
      validation for whole-number nutrients and 0.1 L water increments.
- [x] **T004** Implement sodium/salt entry validation and nearest-whole-mg salt
      conversion.
- [x] **T005** Implement CSV parsing, exact header validation, invalid-row
      reporting, and silent first-row-wins duplicate handling.
- [x] **T006** Add domain and parser tests covering numeric boundaries,
      conversion, names, CSV variants, invalid rows, and duplicates. Covers AC-1,
      AC-2, AC-4, and AC-5.

## Phase 2 — Catalogue state and list behavior

- [x] **T007** Implement catalogue reducer actions for initialization, create,
      edit, delete, availability, and replacement with invariant enforcement.
- [x] **T008** Implement search, source/availability filters, stable sorting,
      fixed 20-item pagination, page reset, and page clamping selectors.
- [x] **T009** Add reducer and selector tests for permissions, duplicate
      prevention, filter combinations, every sortable column, pagination, and
      replacement. Covers AC-3, AC-6, AC-7, AC-8, AC-10, and AC-11.

## Phase 3 — Persistence and lifecycle

- [x] **T010** Upgrade the IndexedDB schema without disturbing existing plans
      and add independent catalogue and view-preference persistence.
- [x] **T011** Implement initial CSV setup and structurally validated catalogue
      restoration.
- [x] **T012** Implement automatic bundled-version replacement, including
      custom-option deletion, availability reset, preserved view state, and notice.
- [x] **T013** Implement manual reload with identical replacement semantics.
- [x] **T014** Add debounced saves, `pagehide` flush, and non-blocking in-memory
      fallback on storage errors.
- [x] **T015** Add persistence tests for initialization, restoration, both
      reload paths, partial recovery, destructive replacement, view persistence,
      and storage failure. Covers AC-8, AC-9, AC-11, and AC-12.

## Phase 4 — Navigation and catalogue list UI

- [x] **T016** Refactor the application shell to provide accessible top-level
      calculator/catalogue navigation while preserving language and calculator
      state.
- [x] **T017** Add typed German and English catalogue, validation, confirmation,
      warning, status, source, and availability messages.
- [x] **T018** Build the catalogue page with brand and name search, brand,
      source and availability filters, sortable desktop table, and 20-item
      pagination.
- [x] **T019** Build the responsive mobile card presentation without duplicate
      assistive-technology content or horizontal page overflow.
- [x] **T020** Add availability controls for both sources and omit standard edit
      and delete actions.
- [x] **T021** Add navigation/list component tests. Covers AC-6, AC-10, AC-11,
      AC-13, and AC-14.

## Phase 5 — Maintenance dialogs

- [x] **T022** Build a reusable accessible dialog wrapper with initial focus,
      focus containment, Escape handling, and return focus.
- [x] **T023** Build the custom add/edit dialog with inline validation,
      sodium/salt selector, live sodium preview, and successful close/status flow.
- [x] **T024** Build custom deletion confirmation with permanent removal.
- [x] **T025** Build destructive catalogue-reload confirmation and completion
      status.
- [x] **T026** Surface localized CSV row warnings, version-reload notices,
      recovery notices, and storage warnings.
- [x] **T027** Add dialog and notice component tests. Covers AC-2 through AC-9,
      AC-12, AC-13, and AC-14.

## Phase 6 — End-to-end verification

- [x] **T028** Add an end-to-end custom-option add/edit/availability/delete
      workflow using sodium and salt entry.
- [x] **T029** Add search/filter/sort/pagination and refresh-persistence
      end-to-end coverage.
- [x] **T030** Add manual and automatic reload end-to-end coverage.
- [x] **T031** Add German/English preservation and mobile no-overflow coverage.
- [x] **T032** Verify keyboard-only navigation, maintenance dialogs,
      confirmations, availability, filtering, sorting, and pagination.
- [x] **T033** Extend the runtime network assertion to catalogue workflows.
- [x] **T034** Run the full repository check and production-build smoke test,
      then complete the traceability matrix.

## Suggested delivery slices

1. **Data foundation:** T001–T006.
2. **State and persistence:** T007–T015.
3. **Usable catalogue:** T016–T027.
4. **Release verification:** T028–T034.

## Phase 7 — Required product brands

- [x] **T035** Extend the nutrition-option and form-draft types with required
      `brand`, and extend sortable fields and default view state with `brand`.
- [x] **T036** Implement independent brand/name normalization, required-brand
      validation, and case-insensitive uniqueness by normalized brand/name pair.
      Update deterministic standard IDs to include both values.
- [x] **T037** Change the bundled CSV contract to
      `brand;name;carbohydraths;sodium;water`, populate every standard row with
      its brand, and bump the catalogue version and content digest.
- [x] **T038** Update CSV parsing and catalogue mutation invariants for required
      brands and first-valid-row-wins handling of duplicate brand/name pairs.
      Covers AC-1, AC-2, AC-3, and AC-5.
- [x] **T039** Update selectors so search matches brand or name, add brand
      sorting, and make brand/name/ID the deterministic tie-break order. Set
      brand ascending with name ascending as the default order. Covers AC-10
      and AC-11.
- [x] **T040** Require and render the localized brand field in add/edit flows,
      display brands in desktop and mobile catalogue views, and expose brand
      sorting and combined brand/name search accessibly. Covers AC-3, AC-5,
      AC-10, AC-13, and AC-14.
- [x] **T041** Require brands during stored-catalogue validation and verify that
      pre-brand catalogue data triggers bundle recovery while preserving valid
      view preferences and existing race plans. Covers AC-9, AC-11, and AC-12.
- [x] **T042** Extend unit, component, persistence, and end-to-end tests for
      required brands, duplicate pairs, same-name/different-brand options,
      five-column import, search, sorting, localization, responsive display,
      refresh restoration, and recovery from pre-brand data.
- [ ] **T043** Run formatting, type checking, linting, unit/component tests,
      production build, and Playwright tests; then update
      [verification.md](./verification.md) for the brand-extension coverage.

## Brand-extension delivery slices

1. **Domain and import:** T035–T038.
2. **Catalogue behavior and UI:** T039–T040.
3. **Persistence and verification:** T041–T043.
