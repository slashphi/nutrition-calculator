# Race Nutrition Calculator — Technical Implementation Plan

Status: Proposed  
Source specification: [spec.md](./spec.md)

## 1. Technical approach

Build a client-only single-page application with:

- React and TypeScript in strict mode.
- Vite for local development and static production builds.
- CSS modules or colocated plain CSS with design tokens; no component framework is required.
- Vitest and Testing Library for unit and component tests.
- Playwright for critical end-to-end flows.
- Native `DOMParser` for GPX XML parsing.
- Native IndexedDB for plan and processed GPX persistence.
- GitHub Actions for verification and GitHub Pages deployment.

Use current stable package releases when the project is initialized and commit the generated lockfile. Avoid a client-side router because version 1 has one workflow and GitHub Pages deep-link handling would add complexity without product value.

Vite must build with the repository Pages base path (`/nutrition-calculator/`). The deployment workflow must build the static artifact, upload it with the GitHub Pages artifact action, and deploy it with the Pages deployment action.

## 2. Architecture

```text
src/
  app/
    App.tsx
    appReducer.ts
    selectors.ts
  domain/
    model.ts
    validation.ts
    effort.ts
    nutrition.ts
    timeAllocation.ts
    segmentation.ts
  gpx/
    parseGpx.ts
    geometry.ts
    segmentCourse.ts
    gpxErrors.ts
  persistence/
    database.ts
    planRepository.ts
    migrations.ts
  i18n/
    en.ts
    de.ts
    locale.ts
  components/
    RaceForm/
    CourseInput/
    AidStationEditor/
    RaceSummary/
    NutritionSummary/
    SegmentPlan/
    Disclaimer/
  styles/
    tokens.css
    global.css
  test/
    fixtures/
e2e/
```

Dependencies point inward:

```text
UI → application state → domain
UI → GPX adapter → domain
UI → persistence adapter
```

The domain layer must contain pure TypeScript functions and no React, browser-storage, XML, or translation concerns. This makes the formulas and edge cases directly testable.

## 3. State model

Use a single reducer as the authoritative in-memory state. Derive results through memoized selectors rather than storing duplicated calculation output.

```ts
type Language = "en" | "de";
type CourseMode = "manual" | "gpx";

interface RacePlan {
  schemaVersion: number;
  language: Language;
  raceName: string;
  weightKg: number | null;
  intakePercent: number;
  enteredFinishMinutes: number | null;
  timingMode: "allocated" | "overridden";
  course: ManualCourse | GpxCourse | null;
  stations: AidStation[];
  segmentTimeOverrides: Record<SegmentId, number>;
}

interface AidStation {
  id: string;
  name: string;
  nameSource: "default" | "custom";
  kilometer: number;
  waterOnly: boolean;
}

interface CoursePoint {
  distanceKm: number;
  latitude: number;
  longitude: number;
  elevationM: number;
}

interface Segment {
  id: string;
  from: Endpoint;
  to: Endpoint;
  distanceKm: number;
  ascentM: number;
  descentM: number;
  durationMinutes: number | null;
}
```

Persist durations as integer minutes and perform all calculation values with JavaScript numbers. Generate stable station IDs with `crypto.randomUUID()`. Segment IDs should be derived from their endpoint IDs so overrides can be retained when unrelated stations change.

Manual segment geometry is authoritative after the first station is added. Course totals are selectors that sum segment values.

## 4. Domain algorithms

### 4.1 Nutrition

Implement the formulas from the specification as one pure calculation pipeline:

```ts
effort = distanceKm + ascentM / 100;
energyNeedKcal = weightKg * effort;
intakeTargetKcal = (energyNeedKcal * intakePercent) / 100;
carbohydratesG = intakeTargetKcal / 4;
waterL = carbohydratesG / 80;
sodiumMg = waterL * 500;
```

Return unrounded values. Apply display rounding only in formatting functions:

- kcal: nearest 10.
- carbohydrate: nearest integer gram.
- water: one decimal place.
- sodium: nearest integer milligram.

Do not sum displayed segment results to construct overall results.

### 4.2 Time allocation

Represent all entered and displayed times as integer minutes.

1. Calculate each segment's effort.
2. Calculate its exact fractional allocation from total minutes.
3. Round every segment except the final segment to the nearest minute.
4. Assign the remaining minutes to the final segment.
5. Reject allocation if course effort is zero or the final remainder would be negative.

When a segment time is overridden, retain all other displayed segment minutes and set the total to their sum. Entering a new total clears every override and reruns allocation.

### 4.3 GPX parsing

Parse XML with `DOMParser` and inspect element `localName` so default or prefixed namespaces behave consistently.

Accept exactly one of:

- One `trk` containing exactly one `trkseg` and at least two `trkpt` points.
- One `rte` containing at least two `rtept` points.

Reject:

- XML parser errors.
- A mixture of tracks and routes.
- Multiple tracks or routes.
- Multiple track segments.
- Fewer than two points.
- Missing, non-finite, or out-of-range latitude/longitude.
- Missing or non-finite elevation at any point.

Ignore waypoints and unrelated metadata.

### 4.4 GPX geometry

Calculate horizontal distance between consecutive coordinates with the haversine formula and a documented constant Earth radius. For every point, retain cumulative distance in kilometres.

Use raw consecutive GPX elevations:

- Positive elevation delta contributes to ascent.
- Negative elevation delta contributes its absolute value to descent.
- Zero contributes to neither.

Do not round geometry internally.

To place a station between two points:

1. Locate the edge containing the requested cumulative kilometre.
2. Calculate its fractional position along that edge.
3. Linearly interpolate coordinate and elevation.
4. Split that edge's distance and elevation delta proportionally.
5. Allocate the split values to the adjacent segments.

The final segment must absorb negligible floating-point distance differences so segment distances equal course distance within numerical tolerance.

### 4.5 Manual segmentation

Initially store the manual course as one Start-to-Finish segment.

When inserting a station:

1. Identify the segment containing its kilometre.
2. Derive the two new distances from kilometre boundaries.
3. Require ascent and descent values for both new segments before committing.
4. Replace the old segment atomically.

When deleting a station, combine adjacent segment geometry and durations. When moving a station, require replacement geometry for the two affected manual segments.

Station mutations must be transactional in UI state: invalid or incomplete split data must not partially change the current course.

## 5. Validation strategy

Provide field validation during editing and plan-level validation before showing results.

Use structured errors:

```ts
interface ValidationIssue {
  code: string;
  fieldPath: string;
  values?: Record<string, string | number>;
}
```

Domain and parser code return error codes, not translated text. UI components translate codes and interpolate values.

Validate:

- Required and bounded race/athlete inputs.
- Whole-number weight, percentage, and elevations.
- Positive distance and finishing time.
- `HH:mm` parsing, allowing hours greater than 23 and minutes from 00–59.
- Station endpoint, range, and duplicate rules.
- Complete manual segment geometry.
- Supported GPX structure and point data.
- Non-zero course effort.

Use decimal tolerance only for internal geometry comparisons, never to permit duplicate station kilometres.

## 6. User-interface composition

Use one responsive page with these sections:

1. Header and language switch.
2. Race and athlete details.
3. Course mode and GPX/manual input.
4. Course summary.
5. Aid-station editor.
6. Overall nutrition.
7. Segment plan.
8. Medical disclaimer.

On mobile:

- Use a single-column form.
- Render the segment plan as cards or a table inside a labelled horizontal scroll region.
- Keep all controls at least 44 CSS pixels in their primary touch dimension.
- Keep errors adjacent to fields and announce summary/file errors using an ARIA live region.

Use native inputs where practical. A time input cannot represent finishing times over 23 hours reliably, so implement `HH:mm` as an accessible text field with explicit parsing and examples.

Changing language updates UI strings without changing domain state. Use typed English and German dictionaries and `Intl.NumberFormat`; do not add an internationalization framework for two fixed languages.

## 7. Persistence

Use an IndexedDB database named `ultra-race-nutrition` with:

- A `plans` object store containing the current versioned plan.
- A `courses` object store containing processed GPX points keyed by course ID.

Persist only after state passes structural validation and debounce writes to avoid a transaction for every keystroke. Flush pending valid state on `pagehide`.

On startup:

1. Open the database.
2. Run schema migrations.
3. Load and structurally validate saved state.
4. Restore valid portions.
5. Fall back to defaults for invalid portions and show one localized restoration notice.

The original GPX XML does not need to be stored; processed points are sufficient. No application code may make network requests. Fonts and runtime assets must be bundled or use system resources.

## 8. Testing strategy

### Unit tests

Cover:

- Every formula and rounding boundary.
- Reference 80 kg / 10 km / 1,000 m scenario.
- Descent exclusion.
- Time allocation and final-minute correction.
- Time override and reset semantics.
- `HH:mm` parsing beyond 24 hours.
- Station sorting, naming, insertion, movement, and deletion.
- Manual segment split/merge.
- Validation boundaries.
- Haversine distance and elevation accumulation.
- GPX parsing for track, route, namespaces, and every rejection rule.
- GPX interpolation at exact points and within edges.

### Component/integration tests

Cover:

- Immediate recalculation after valid changes.
- Mode switching and invalid GPX messages.
- Manual split workflow.
- Time override behavior.
- Language switching without data loss.
- Water-only indication without calculation changes.
- Persistence restoration and partial recovery.

### End-to-end tests

Cover at least:

1. Complete manual reference scenario.
2. Upload GPX, add stations, and verify segment results.
3. Reject malformed/multi-segment GPX.
4. Override segment time and then enter a new total time.
5. Refresh and restore a GPX-based plan.
6. Switch German/English while preserving data.
7. Mobile viewport workflow without page-level horizontal overflow.

Run unit/component tests, type checking, linting, and production build on every pull request. Run the focused Playwright suite before deployment.

## 9. Delivery and deployment

Create two GitHub Actions workflows:

- `ci.yml`: install from lockfile, type-check, lint, test, and build on pull requests and pushes.
- `deploy-pages.yml`: repeat verification, build, upload `dist`, and deploy on successful changes to `main` or manual dispatch.

The Pages workflow needs `contents: read`, `pages: write`, and `id-token: write`, uses the `github-pages` environment, and permits only one active deployment through a concurrency group.

Repository configuration outside code:

1. Set Pages build source to GitHub Actions.
2. Protect `main` and require CI when repository policy permits.
3. Confirm the deployed base URL and asset loading.

## 10. Implementation risks

| Risk                    | Consequence                 | Mitigation                                                                                                                                                                               |
| ----------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Noisy GPX elevation     | Inflated nutrition targets  | Required behavior is raw GPX elevation; explain this limitation in help text and retain fixtures for deterministic tests.                                                                |
| Very large GPX files    | Slow parsing or UI blocking | Parse once, keep minimal numeric points, show progress state, and establish a performance fixture before release. Move parsing to a Web Worker only if measured performance requires it. |
| Manual station edits    | Inconsistent segment totals | Apply split/move/delete changes atomically and derive totals only from segments.                                                                                                         |
| Rounded time allocation | Segment total mismatch      | Assign rounding remainder to the Finish segment.                                                                                                                                         |
| Browser storage failure | Lost plan restoration       | Surface storage errors without blocking calculation; keep the active in-memory plan usable.                                                                                              |
| GitHub Pages base path  | Broken production assets    | Configure and test the repository base path in the production build and deployment smoke test.                                                                                           |

## 11. Definition of done

Version 1 is complete when:

- All 16 acceptance criteria in the specification have automated coverage or a documented manual verification.
- Type checking, linting, unit/component tests, end-to-end tests, and production build pass.
- The application is usable at mobile and desktop widths.
- English and German flows are complete.
- A refreshed GPX plan restores without re-upload.
- Browser developer tools show no application network request containing plan data.
- The production build is deployed successfully to GitHub Pages.
