# Nutrition Planning — Verification

Status: 10-second timeout and loading indicator implemented; full browser
verification pending

## Automated coverage

| Criterion                        | Coverage                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| AC-1 Manual segment planning     | Planning reducer/domain tests, App component test, planning E2E                                 |
| AC-2A Shortfall tolerances       | Boundary-focused planning domain tests                                                          |
| AC-2B Nutrition comparison table | Component tests for columns, signed delta, categories, and 5%/20% contained highlighting bounds |
| AC-3 Automatic priorities        | Objective, coverage, undercoverage, diversity, 10-second timeout, loader, and performance tests |
| AC-4 Automatic replacement       | Worker/client behavior and planning E2E                                                         |
| AC-5 Unavailable retention       | Planning status and reconciliation tests                                                        |
| AC-6 Option update/deletion      | Shared catalogue lifecycle and reconciliation tests                                             |
| AC-7 Product summary             | Planning domain and App component tests                                                         |
| AC-8 Course changes              | Split/combine/move reconciliation tests                                                         |
| AC-9 Persistence/privacy         | Schema migration, round-trip, recovery, and planning E2E                                        |
| AC-10 Localization/accessibility | Bilingual inline UI, semantic controls/statuses, responsive styles; final browser verification pending |

## Verification results

- The production optimizer deadline is 10 seconds.
- A visible indeterminate loader, localized running text, `aria-busy`, and
  cancellation communicate and control the running calculation.
- Segment planning status is presented as compact visual indicators while
  retaining text labels for assistive technology.
- Assigned options are grouped as selected products with stable serving-count
  controls and explicit removal.
- Delta severity is visually contained to the displayed delta value so warning
  and critical states remain scannable without dominating the table.
- Optimizer and planning-view component tests pass, including deadline and
  loading-state coverage.
- The focused nutrition-planning Playwright workflow passes in Chromium and in
  the isolated mobile project.
- TypeScript typecheck: passed.
- Prettier check for all changed feature files: passed after formatting.
- Production build and GitHub Pages base-path smoke test: passed.
- The optimizer Web Worker is emitted as an independent production asset.

## Pending release checks

- Run the complete `npm test`, `npm run lint`, and `npm run test:e2e` suites.
- Complete keyboard-only and mobile browser verification.
