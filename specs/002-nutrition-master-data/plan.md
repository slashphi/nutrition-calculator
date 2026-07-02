# Nutrition Master Data — Technical Implementation Plan

Status: Proposed  
Source specification: [spec.md](./spec.md)

## 1. Technical approach

Extend the existing React and TypeScript single-page application without
introducing a routing dependency. Keep a top-level page key in application
state and render either the calculator or catalogue page. Navigation shall use
semantic links or buttons with a current-page indicator; browser deep links are
not required by this feature.

Bundle the standard catalogue as a raw UTF-8 asset imported at build time.
Parse it locally without a CSV dependency because the fixed contract has four
semicolon-delimited fields and does not require quoted delimiters. Add an
explicit catalogue-content version beside the asset. Changing the CSV requires
changing this version; an automated test shall prevent a content/version
mismatch by checking a committed content digest.

## 2. Proposed structure

```text
src/
  app/
    App.tsx
    Navigation.tsx
  catalogue/
    model.ts
    validation.ts
    parseCatalogueCsv.ts
    catalogueReducer.ts
    selectors.ts
    NutritionCataloguePage.tsx
    NutritionOptionDialog.tsx
    DeleteOptionDialog.tsx
    ReloadCatalogueDialog.tsx
  data/
    nutrition-options.csv
    catalogueVersion.ts
  persistence/
    database.ts
    catalogueRepository.ts
  i18n/
    en.ts
    de.ts
e2e/
  nutrition-catalogue.spec.ts
```

Keep catalogue validation, conversion, filtering, sorting, and pagination as
pure TypeScript. React components own interaction and accessibility behavior;
the repository owns IndexedDB details.

## 3. Data model

```ts
type NutritionOptionSource = "standard" | "custom";

interface NutritionOption {
  id: string;
  name: string;
  carbohydratesG: number;
  sodiumMg: number;
  waterDeciliters: number;
  available: boolean;
  source: NutritionOptionSource;
}

interface CatalogueState {
  catalogueVersion: string;
  options: NutritionOption[];
}

interface CatalogueViewState {
  search: string;
  source: "all" | NutritionOptionSource;
  availability: "all" | "available" | "unavailable";
  sortBy:
    | "name"
    | "carbohydratesG"
    | "sodiumMg"
    | "waterDeciliters"
    | "available"
    | "source";
  sortDirection: "ascending" | "descending";
  page: number;
}
```

Store water as integer decilitres so the 0.1 L increment is exact. Convert to
litres only for display and CSV parsing. Generate custom IDs with
`crypto.randomUUID()`. Generate deterministic standard IDs from normalized
names plus the catalogue version or row identity; consumers must not retain
standard IDs across catalogue replacement.

Normalize names with `trim().toLocaleLowerCase("und")` for uniqueness and
search while preserving the trimmed display value. Use a stable secondary
name/ID comparison for deterministic sorting.

## 4. Import and validation

The parser shall:

1. Normalize an optional UTF-8 byte-order mark and line endings.
2. require the exact four-field header;
3. split each non-blank row on semicolons;
4. validate the name and numeric fields;
5. convert water litres to exact integer decilitres;
6. retain the first valid normalized name;
7. silently discard later duplicate names;
8. return valid options plus row-numbered issues for other invalid rows.

Treat an invalid header as a catalogue-level import error. The checked-in
production asset must have a valid header, so tests and CI should catch this.
At runtime, retain an empty usable catalogue and show a localized import error
if the bundled asset cannot be parsed.

Use string-pattern validation before numeric conversion to reject exponent
notation and fractions where whole numbers are required. Validate safe integer
carbohydrate/sodium values and safe integer decilitres. Salt conversion uses
`Math.round(saltMg / 2.5)` after validating salt as a non-negative safe integer.

## 5. State and selectors

Use a catalogue reducer for create, update, delete, availability, import, and
reload actions. Every mutation shall enforce domain invariants rather than
relying only on form validation.

Compose pure selectors in this order:

```text
all options
  → case-insensitive name search
  → source filter
  → availability filter
  → stable sort
  → page clamp
  → 20-item page
```

Reset page to 1 for search/filter/sort actions. Clamp it after data mutations.
Keep form drafts outside persisted catalogue state.

## 6. Persistence and catalogue lifecycle

Upgrade the existing IndexedDB schema and add stores or records for:

- Current catalogue and bundled catalogue version.
- Catalogue view preferences.

Do not couple catalogue restoration to race-plan validity. Load each feature's
state independently.

Startup sequence:

1. Parse the bundled CSV.
2. Load and validate stored catalogue and view preferences.
3. If no stored catalogue exists, initialize from the bundle.
4. If its catalogue version differs, replace it from the bundle and notify.
5. Otherwise restore it.
6. Restore each valid view preference and default only invalid fields.

Debounce catalogue and preference saves and flush pending state on `pagehide`,
consistent with existing plan persistence. On storage failure, retain state in
memory and show one non-blocking warning.

## 7. User interface

Add persistent top-level navigation to the calculator and nutrition-options
page. Use the existing language state as the shared application language.

Catalogue controls comprise name search, two labelled filters, sortable column
headers, a fixed-size paginator, an add action, and a reload action. Use a
semantic table at wide viewports and equivalent labelled cards at narrow
viewports. Avoid rendering both representations to assistive technology
simultaneously.

Use native `dialog` where browser/test support is adequate, with a small shared
dialog wrapper for focus placement, containment, Escape, return focus, and
accessible labelling. The add/edit form selects sodium or salt input. Salt
input updates an `aria-live` sodium preview.

Availability should use a labelled checkbox or switch. Standard rows omit edit
and delete controls entirely. Use confirmation dialogs for custom deletion and
catalogue reload.

## 8. Testing strategy

### Unit tests

Cover CSV header/row parsing, byte-order mark and line endings, invalid row
reporting, silent duplicate handling, numeric boundaries, water conversion,
name normalization, salt rounding, permissions, selectors, stable sorting,
filter combinations, page reset, and page clamping.

### Component tests

Cover navigation and language preservation, table/card data, add/edit
validation, salt preview, success announcements, availability, absent standard
actions, delete/reload confirmations, error notices, and keyboard dialog
behavior.

### Persistence tests

Cover first initialization, ordinary restoration, automatic version reload,
manual reload, destructive replacement semantics, view-state preservation,
partial invalid preference recovery, invalid catalogue recovery, and storage
failure.

### End-to-end tests

Cover the primary custom-option lifecycle, search/filter/sort/pagination,
refresh restoration, reload, language switching, mobile layout, keyboard
operation, and absence of runtime network requests.

## 9. Delivery constraints

- Preserve all existing calculator behavior and persisted plans.
- Keep runtime processing and persistence entirely local.
- Add no production dependency unless native parsing/dialog behavior proves
  insufficient and the tradeoff is documented.
- Run formatting, type checking, linting, unit/component tests, production
  build, and Playwright tests before completing the feature.

