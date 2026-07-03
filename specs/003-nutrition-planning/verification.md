# Nutrition Planning — Verification

Status: Implementation complete; browser verification pending

## Automated coverage

| Criterion                        | Coverage                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| AC-1 Manual segment planning     | Planning reducer/domain tests, App component test, planning E2E                               |
| AC-2 Shortfall tolerances        | Boundary-focused planning domain tests                                                        |
| AC-3 Automatic priorities        | Objective, coverage, undercoverage, diversity, timeout, and performance unit tests            |
| AC-4 Automatic replacement       | Worker/client behavior and planning E2E                                                       |
| AC-5 Unavailable retention       | Planning status and reconciliation tests                                                      |
| AC-6 Option update/deletion      | Shared catalogue lifecycle and reconciliation tests                                           |
| AC-7 Product summary             | Planning domain and App component tests                                                       |
| AC-8 Course changes              | Split/combine/move reconciliation tests                                                       |
| AC-9 Persistence/privacy         | Schema migration, round-trip, recovery, and planning E2E                                      |
| AC-10 Localization/accessibility | Bilingual inline UI, semantic controls, responsive styles; final browser verification pending |

## Verification results

- TypeScript typecheck: passed.
- Prettier check for all changed feature files: passed after formatting.
- Production build and GitHub Pages base-path smoke test: passed.
- The optimizer Web Worker is emitted as an independent production asset.
- Vitest and ESLint start but do not complete on the current WSL 1 Windows
  mount; no diagnostic is emitted before they stall.
- Playwright cannot start its local Vite server in the sandbox because binding
  `127.0.0.1:4173` returns `EPERM`. The request for an unsandboxed local-server
  run was rejected by the execution environment.

## Pending release checks

- Run `npm test` and `npm run lint` on WSL 2, Linux, or CI.
- Run `npm run test:e2e` where localhost binding and Playwright browser
  dependencies are available.
- Complete keyboard-only and mobile browser verification.
