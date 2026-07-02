# Nutrition Master Data — Acceptance Criteria Verification

Status: Implemented

Automated domain, persistence, and component coverage passes locally. The
Playwright catalogue workflow is implemented in
`e2e/nutrition-catalogue.spec.ts`; local execution requires the missing host
Chromium libraries and WebKit binary.

| Criterion                               | Planned automated coverage                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| AC-1 Initial standard import            | CSV parser and catalogue repository unit tests                                    |
| AC-2 Invalid and duplicate CSV rows     | CSV parser unit tests and warning component tests                                 |
| AC-3 Add custom option with sodium      | Reducer, dialog component, and catalogue E2E tests                                |
| AC-4 Salt conversion                    | Validation/conversion unit tests, dialog component tests, and catalogue E2E tests |
| AC-5 Validation and uniqueness          | Validation, reducer, and dialog component tests                                   |
| AC-6 Standard and custom permissions    | Reducer, list component, and catalogue E2E tests                                  |
| AC-7 Custom deletion                    | Reducer, confirmation component, and catalogue E2E tests                          |
| AC-8 Manual catalogue reload            | Repository, reload component, and catalogue E2E tests                             |
| AC-9 Automatic catalogue-version reload | Repository and catalogue E2E tests                                                |
| AC-10 Search, filters, and sorting      | Selector, list component, and catalogue E2E tests                                 |
| AC-11 Pagination and view persistence   | Selector, repository, and catalogue E2E tests                                     |
| AC-12 Storage failure and privacy       | Repository/component tests and E2E network assertion                              |
| AC-13 Localization                      | Component and catalogue E2E tests                                                 |
| AC-14 Responsive and keyboard use       | Component accessibility checks, mobile E2E, and documented keyboard check         |

Unit and component tests shall run through Vitest. Browser acceptance tests
shall run through Playwright in CI.
