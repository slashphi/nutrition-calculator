# Nutrition Master Data — Technical Implementation Plan

Status: Implemented; browser verification pending
Source specification: [spec.md](./spec.md)

## 1. Technical approach

Extend the existing React and TypeScript single-page application without
introducing a routing dependency. Keep a top-level page key in application
state and render either the calculator or catalogue page. Navigation shall use
semantic links or buttons with a current-page indicator; browser deep links are
not required by this feature.

Extend the implemented catalogue so every standard and custom option carries a
required brand. Treat the normalized brand/name pair as the option's business
key throughout validation, import, persistence, search, and sorting.

Bundle the standard catalogue as a raw UTF-8 asset imported at build time.
Parse it locally without a CSV dependency because the fixed contract has five
semicolon-delimited fields and does not require quoted delimiters. Keep the
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
  brand: string;
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
    | "brand"
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
brand/name pairs plus the catalogue version or row identity; consumers must
not retain standard IDs across catalogue replacement.

Normalize brands and names independently with
`trim().toLocaleLowerCase("und")`. Build the uniqueness key from both normalized
values while preserving their trimmed display values. Default sorting compares
brand, then name, then ID for deterministic results. Other sort fields use
brand/name/ID as stable tie-breakers.

## 4. Import and validation

The parser shall:

1. Normalize an optional UTF-8 byte-order mark and line endings.
2. require the exact five-field header
   `brand;name;carbohydraths;sodium;water`;
3. split each non-blank row on semicolons;
4. validate the required brand, required name, and numeric fields;
5. convert water litres to exact integer decilitres;
6. retain the first valid normalized brand/name pair;
7. silently discard later duplicate brand/name pairs;
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
  → case-insensitive brand-or-name search
  → source filter
  → availability filter
  → stable sort
  → page clamp
  → 20-item page
```

Reset page to 1 for search/filter/sort actions. Clamp it after data mutations.
Keep form drafts outside persisted catalogue state.

## 6. Persistence and catalogue lifecycle

Update the persisted catalogue structure so every restored option requires a
valid brand. Bump the bundled catalogue version together with the five-column
CSV. Existing stored catalogues without brands shall fail structural
validation and follow the specified catalogue-recovery path: replace options
from the updated bundle, reset availability, remove custom options, preserve
valid view preferences, and show the localized recovery notice.

The existing IndexedDB stores or records remain responsible for:

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

Catalogue controls comprise combined brand/name search, two labelled filters,
sortable brand and name columns plus the existing sortable columns, a
fixed-size paginator, an add action, and a reload action. Use a semantic table
at wide viewports and equivalent labelled cards at narrow viewports. Avoid
rendering both representations to assistive technology simultaneously.

Use native `dialog` where browser/test support is adequate, with a small shared
dialog wrapper for focus placement, containment, Escape, return focus, and
accessible labelling. The add/edit form requires brand and name fields and
selects sodium or salt input. Salt input updates an `aria-live` sodium preview.

Availability should use a labelled checkbox or switch. Standard rows omit edit
and delete controls entirely. Use confirmation dialogs for custom deletion and
catalogue reload.

## 8. Testing strategy

### Unit tests

Cover the five-column CSV header and row parsing, byte-order mark and line
endings, missing brands, invalid row reporting, silent duplicate brand/name
handling, numeric boundaries, water conversion, independent brand/name
normalization, salt rounding, permissions, selectors, stable sorting, filter
combinations, page reset, and page clamping.

### Component tests

Cover navigation and language preservation, brand and name rendering in
table/cards, required-brand add/edit validation, duplicate-pair validation,
salt preview, success announcements, availability, absent standard actions,
delete/reload confirmations, error notices, and keyboard dialog behavior.

### Persistence tests

Cover first initialization, ordinary restoration with brands, automatic
version reload, recovery of pre-brand stored catalogues, manual reload,
destructive replacement semantics, view-state preservation, partial invalid
preference recovery, invalid catalogue recovery, and storage failure.

### End-to-end tests

Cover the primary branded custom-option lifecycle, brand/name search and
sorting, filter/pagination behavior, refresh restoration, reload, language
switching, mobile layout, keyboard operation, and absence of runtime network
requests.

## 9. Delivery constraints

- Preserve all existing calculator behavior and persisted plans.
- Keep runtime processing and persistence entirely local.
- Add no production dependency unless native parsing/dialog behavior proves
  insufficient and the tradeoff is documented.
- Run formatting, type checking, linting, unit/component tests, production
  build, and Playwright tests before completing the feature.
