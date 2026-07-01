# Acceptance Criteria Verification

| Criterion                     | Automated coverage                                                                |
| ----------------------------- | --------------------------------------------------------------------------------- |
| AC-1 Reference energy         | `src/domain/nutrition.test.ts`, `src/app/App.test.tsx`, `e2e/manual-plan.spec.ts` |
| AC-2 Nutrition chain          | `src/domain/nutrition.test.ts`, `src/app/App.test.tsx`                            |
| AC-3 Descent exclusion        | `src/domain/nutrition.test.ts`                                                    |
| AC-4 Segment totals           | `src/domain/segmentation.test.ts`, `src/gpx/parseGpx.test.ts`                     |
| AC-5 Time allocation          | `src/domain/timeAllocation.test.ts`                                               |
| AC-6 Time override            | `src/domain/timeAllocation.test.ts`, `e2e/manual-plan.spec.ts`                    |
| AC-7 GPX segmentation         | `src/gpx/parseGpx.test.ts`, `e2e/gpx-plan.spec.ts`                                |
| AC-8 GPX rejection            | `src/gpx/parseGpx.test.ts`, `e2e/gpx-plan.spec.ts`                                |
| AC-9 Manual segmentation      | `src/domain/segmentation.test.ts`                                                 |
| AC-10 Station validation      | `src/domain/validation.test.ts`                                                   |
| AC-11 Water-only station      | `e2e/gpx-plan.spec.ts`                                                            |
| AC-12 Immediate recalculation | `src/app/App.test.tsx`                                                            |
| AC-13 Localization            | `src/app/App.test.tsx`, `e2e/manual-plan.spec.ts`                                 |
| AC-14 Persistence             | `src/persistence/planRepository.test.ts`, `e2e/manual-plan.spec.ts`               |
| AC-15 Privacy                 | `e2e/manual-plan.spec.ts`                                                         |
| AC-16 Mobile usability        | `e2e/manual-plan.spec.ts`                                                         |

Unit and component tests run through Vitest. Browser acceptance tests run through Playwright in CI after Chromium and its Linux dependencies are installed.
