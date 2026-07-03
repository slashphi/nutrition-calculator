# Nutrition Master Data — Feature Specification

Status: Implemented  
Target platform: Existing static web application hosted on GitHub Pages  
Depends on: Race Nutrition Calculator version 1

## 1. Purpose and terminology

The application shall provide a catalogue in which a user maintains the
nutrition options available for planning. Integrating catalogue items into a
race or segment plan is outside this feature's scope.

- **Nutrition option:** The nutrient content of one serving of a product.
- **Standard option:** An option supplied by a semicolon-delimited CSV file in
  the repository.
- **Custom option:** An option created by the user.
- **Available:** The option may be selected by this user in a future planning
  feature.
- **Catalogue reload:** Replacement of all catalogue data with the current
  valid rows from the bundled CSV.

Product names are master data, not localized application text.

## 2. Nutrition-option data

Every nutrition option shall contain:

- A stable identifier.
- A required name.
- Carbohydrates per serving in whole grams.
- Sodium per serving in whole milligrams.
- Water per serving in litres, in increments of 0.1 L.
- Availability status.
- Source: standard or custom.

Carbohydrates, sodium, and water may be zero. Values shall be non-negative,
finite decimal notation within JavaScript's safe numeric range. The interface
shall reject fractional carbohydrate and sodium values, scientific notation,
`NaN`, infinity, and values outside the safe range. There is no smaller
business-defined maximum.

Names shall be trimmed before validation and storage. An empty or
whitespace-only name is invalid. Names shall be unique across standard and
custom options after trimming and case-insensitive comparison. Their original
capitalization shall otherwise be preserved.

## 3. Sodium and salt entry

The add/edit dialog shall let the user choose one input method:

- Sodium in whole milligrams.
- Salt in whole milligrams.

Only the selected input shall be editable. When salt is selected, the
application shall immediately display the calculated sodium preview:

```text
sodium_mg = round(salt_mg / 2.5)
```

Rounding shall be to the nearest whole milligram. The catalogue shall store
only sodium, irrespective of the input method. Editing an existing custom
option shall therefore open with sodium selected.

## 4. Standard catalogue import

The repository shall contain a UTF-8, semicolon-delimited CSV file with this
exact header:

```csv
name;carbohydraths;sodium;water
```

The misspelled `carbohydraths` header is part of the agreed import contract.
The initial file shall contain:

```csv
name;carbohydraths;sodium;water
Testprodukt;24;200;0.1
```

The application shall initialize the catalogue from the bundled CSV when no
catalogue has previously been stored. Every successfully imported standard
option shall initially be available.

CSV rows shall use the same validation rules as user-entered options. Blank
rows shall be ignored. Invalid rows shall be skipped while valid rows remain
usable. The interface shall show a localized warning that identifies invalid
skipped rows sufficiently for the user to locate them. If multiple CSV rows
have names that compare as duplicates, the first valid row shall win and later
duplicates shall be skipped silently.

The bundled catalogue shall have a version derived from or changed with its
contents. When an application release contains a different catalogue version,
the application shall automatically reload the catalogue before showing it.
This reload shall:

- Delete all custom options.
- Discard all saved availability changes.
- Replace all standard options with the current valid CSV rows.
- Mark every imported standard option as available.
- Preserve persisted list-view preferences.
- Show a localized notice explaining that bundled catalogue data changed and
  user catalogue changes were replaced.

Application releases that do not change the bundled catalogue version shall
not reload it.

## 5. Catalogue maintenance

The application shall have top-level navigation between the existing
calculator and a separate nutrition-options maintenance page.

The maintenance page shall show standard and custom options together. Each
option shall display:

- Name.
- Carbohydrates in g.
- Sodium in mg.
- Water in L with one decimal place.
- Availability status.
- Source (standard or custom).

Unavailable options shall remain visible. Users shall be able to change the
availability of both standard and custom options.

### 5.1 Custom options

Users shall be able to add and edit custom options in an accessible dialog.
New custom options shall initially be available. Successful creation or
editing shall close the dialog and display a localized success status.

Users shall be able to delete custom options. Deletion shall require
confirmation, take effect immediately after confirmation, and provide no undo.
Closing an add/edit dialog shall discard unsaved changes without an additional
confirmation.

Standard options shall have no edit or delete actions.

### 5.2 Reload action

The maintenance page shall provide a reload-to-repository-defaults action.
Before reloading, the application shall require confirmation that all custom
options and saved availability changes will be deleted. A confirmed reload
shall have the same replacement behavior as an automatic version reload and
shall show a localized completion status.

## 6. Finding and organizing options

The catalogue shall provide:

- Name search.
- A source filter with all, standard, and custom values.
- An availability filter with all, available, and unavailable values.
- Sorting by name, carbohydrates, sodium, water, availability, or source.
- Pagination with a fixed page size of 20 options.

Default sorting shall be name ascending. Search shall match names only and
shall be case-insensitive. Standard and custom options shall not be separated
into groups.

Changing search, a filter, or sorting shall return to page 1. When deletion or
other data changes make the current page unavailable, the page shall be
clamped to the final available page.

Search text, selected filters, sorting column and direction, and current page
shall persist across top-level navigation and browser refreshes. Catalogue
replacement shall preserve these preferences.

## 7. Persistence, privacy, and failure handling

Catalogue data and list-view preferences shall be stored locally in the
browser using the application's versioned IndexedDB database. No catalogue
data shall be uploaded or transmitted.

If browser storage is unavailable, full, or fails:

- The catalogue shall remain usable in memory for the current page session.
- The application shall show a localized warning that changes may not persist.
- Storage failure shall not block viewing or maintaining the catalogue.

Stored data shall be structurally validated before restoration. Invalid stored
catalogue data shall be replaced from the bundled CSV with a localized
recovery notice. Invalid stored view preferences shall individually fall back
to defaults without invalidating otherwise valid catalogue data.

## 8. Localization, responsive behavior, and accessibility

All page headings, navigation labels, field labels, units, validation errors,
warnings, confirmations, source/status labels, and success messages shall be
available in German and English. Product names shall never be translated.
Changing language shall preserve catalogue data and view state.

The page shall be usable on mobile and desktop:

- Desktop may use a semantic table.
- Mobile may present each option as a card.
- Primary content and controls shall not cause page-level horizontal
  scrolling.
- Dialogs shall have an accessible name, initial focus, keyboard containment,
  Escape handling, and focus restoration.
- Every field shall have an accessible label and associated validation
  message.
- Status, warning, and success messages shall be announced appropriately.
- Availability and source shall not be conveyed by colour alone.
- All functionality shall be keyboard operable with visible focus.

## 9. Acceptance criteria

### AC-1 Initial standard import

Given no stored catalogue  
When the application initializes  
Then it imports every valid row from the bundled CSV as an available standard
option  
And `Testprodukt` contains 24 g carbohydrates, 200 mg sodium, and 0.1 L water.

### AC-2 Invalid and duplicate CSV rows

Given a CSV containing valid, invalid, and duplicate-name rows  
When it is imported  
Then valid unique rows are available  
And invalid rows are skipped and reported  
And the first valid duplicate wins while later duplicates are skipped silently.

### AC-3 Add custom option with sodium

Given a unique valid name and non-negative nutrient values  
When the user creates an option using sodium entry  
Then an available custom option is stored  
And the dialog closes and announces success.

### AC-4 Salt conversion

Given salt entry is selected  
When the user enters 501 mg salt  
Then the immediate sodium preview is 200 mg  
And saving stores 200 mg sodium only  
And editing the option later opens in sodium-entry mode.

### AC-5 Validation and uniqueness

Given an empty name, a case-insensitive duplicate name, a negative value, a
fractional carbohydrate or sodium value, a water value not divisible by
0.1 L, scientific notation, or an unsafe/non-finite value  
Then the option cannot be saved  
And the relevant field explains the problem.

### AC-6 Standard and custom permissions

Given standard and custom options are listed together  
Then both can be marked available or unavailable  
And standard options have no edit or delete actions  
And custom options can be edited and deleted.

### AC-7 Custom deletion

Given a custom option exists  
When deletion is requested  
Then confirmation is required  
And confirming permanently removes the option.

### AC-8 Manual catalogue reload

Given custom options or changed availability exist  
When the user confirms reload  
Then all current options are replaced by valid bundled CSV rows  
And every imported option is standard and available  
And a localized completion status is shown.

### AC-9 Automatic catalogue-version reload

Given stored catalogue data uses an older bundled-catalogue version  
When the application starts with a changed bundled CSV version  
Then it performs the same replacement as a manual reload  
And explains that user catalogue changes were replaced.

### AC-10 Search, filters, and sorting

Given more than one option exists  
When the user searches by name, filters by source or availability, or sorts by
any displayed column  
Then the visible options match all active controls  
And changing one of those controls returns pagination to page 1.

### AC-11 Pagination and view persistence

Given more than 20 matching options  
Then only 20 options are shown per page  
And the user can navigate pages  
And search, filters, sorting, and current page survive navigation and refresh.

### AC-12 Storage failure and privacy

Given browser storage fails  
When the catalogue is maintained  
Then it remains usable in memory and warns that changes may not persist  
And no catalogue data is transmitted.

### AC-13 Localization

Given the user switches between German and English  
Then catalogue UI text changes language  
And product names, catalogue data, and view state remain unchanged.

### AC-14 Responsive and keyboard use

Given a narrow mobile viewport or keyboard-only operation  
Then navigation, search, filters, pagination, availability changes, dialogs,
and confirmations remain usable  
And the page has no page-level horizontal overflow.

## 10. Out of scope

- Selecting nutrition options in a race or segment plan.
- Quantities, stock counts, prices, brands, serving sizes, or package metadata.
- Importing user-supplied CSV files.
- Exporting catalogue data.
- Synchronization between browsers or devices.
- Server-side storage or user accounts.
