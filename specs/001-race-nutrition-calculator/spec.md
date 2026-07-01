# Race Nutrition Calculator — Version 1 Specification

Status: Draft  
Target platform: Static web application hosted on GitHub Pages

## 1. Terminology

- **Energy need:** Estimated total energy expended over the course.
- **Intake target:** The portion of energy need the athlete plans to consume.
- **Course effort:** Distance in kilometres plus elevation gain in hundreds of metres.
- **Aid station:** A point between Start and Finish at a race-kilometre location.
- **Segment:** The course from Start or one aid station to the next aid station or Finish.
- **Water-only:** An informational aid-station classification. It does not alter calculations.
- **GPX mode:** Course geometry is obtained from a local GPX file.
- **Manual mode:** Course and segment values are entered by the user.

Calories shown by the application always mean dietary kilocalories (`kcal`).

## 2. Functional requirements

### 2.1 Race and athlete inputs

The application shall provide:

- A required race name, initially set to `My race`.
- A required athlete weight entered as a whole number from 40 through 150 kg.
- A required expected finishing time entered as `HH:mm`.
- An intake factor entered as a whole percentage from 1 through 100%, defaulting to 30%.

The application shall recalculate all affected results immediately after a valid input changes. A separate Calculate action is not required.

### 2.2 Course input mode

The user shall choose either GPX mode or manual mode.

The interface shall allow the current GPX file to be replaced or removed. Removing a GPX file switches the course to an incomplete state without clearing unrelated race and athlete inputs.

#### GPX mode

The application shall:

- Accept GPX files containing one `<trk>` track or one `<rte>` route.
- Reject files with multiple tracks, multiple routes, or a track containing multiple track segments.
- Reject waypoint-only GPX files.
- Reject a course when required coordinates or elevation values are absent or invalid.
- Display a clear problem message when a file is rejected.
- Block calculation until a valid GPX is supplied or the user switches to manual mode.
- Process the file entirely in the browser.
- Not display the source filename or embedded GPX name.
- Calculate distance, elevation gain, and elevation loss from GPX points.
- Use GPX elevation values directly without elevation smoothing.
- Prevent manual editing of course or segment distance, ascent, and descent.

Distance shall be the cumulative surface distance between consecutive latitude/longitude points. Elevation gain shall be the sum of positive elevation differences; elevation loss shall be the absolute sum of negative elevation differences.

When an aid-station kilometre falls between GPX points, its location and elevation shall be linearly interpolated at that cumulative course distance. This interpolated boundary shall be used to divide distance, ascent, and descent between adjacent segments.

#### Manual mode

The user shall initially enter:

- Total distance in kilometres; decimals are allowed.
- Total elevation gain in whole metres; zero is allowed.
- Total elevation loss in whole metres; zero is allowed.

Before intermediate aid stations are added, Start-to-Finish is one editable segment with these values.

When an aid station splits an existing segment, the user shall enter elevation gain and elevation loss for both resulting segments. Segment distance is derived from station kilometre locations. The course totals shall then be derived by summing all segments; exact agreement with the previously entered totals is not required.

Deleting a station shall combine its adjacent segments by summing their distance, ascent, elevation loss, and time.

### 2.3 Aid stations

Start and Finish shall always exist:

- Start is fixed at kilometre 0.
- Finish is fixed at total course distance and is always named `Finish` in English or the localized equivalent.
- Neither automatic endpoint can be deleted.

The user shall be able to add, edit, and delete intermediate aid stations. Each station shall contain:

- An editable name.
- A kilometre location; decimals are allowed.
- A water-only checkbox.
- Time since the preceding station.
- Elevation gain since the preceding station.
- Elevation loss since the preceding station.

An intermediate station kilometre must be greater than 0 and less than total course distance. Duplicate station kilometres are invalid. Stations shall be sorted automatically by kilometre.

New stations receive localized default names in course order, such as `Aid station 1`. Names need not be unique. When station order changes, only names that remain untouched defaults shall be renumbered; user-edited names shall be preserved.

In GPX mode, segment ascent and descent shall be calculated and read-only. In manual mode, they shall be entered as whole metres.

Adding, deleting, or moving a GPX-mode station shall recalculate the affected segment geometry and replace manual time overrides on affected segments with calculated times.

Water-only status shall be displayed as a badge or equivalent indicator in results. It shall not alter nutrition calculations or generate an additional warning.

### 2.4 Time calculation

For a course or segment:

```text
effort = distance_km + elevation_gain_m / 100
```

Default segment time shall be allocated in proportion to effort:

```text
segment_time =
  expected_total_time × segment_effort / total_course_effort
```

Calculated segment times shall be rounded to the nearest minute. The Finish segment shall absorb any rounding difference so calculated segment times sum exactly to the entered expected finishing time.

The user may overwrite an individual segment time using `HH:mm`. After any override:

- Total finishing time becomes the sum of all displayed segment times.
- The displayed total finishing time is read-only.
- Entering a new expected total finishing time is an explicit action that replaces all segment overrides and recalculates every segment time.

Changing course geometry or station placement shall recalculate segment times affected by that change. Changing the overall expected finishing time shall recalculate all segment times.

### 2.5 Nutrition calculations

Calculations shall use unrounded internal values. Rounding applies only when values are displayed.

For the course or a segment:

```text
energy_need_kcal =
  weight_kg × (distance_km + elevation_gain_m / 100)

intake_target_kcal =
  energy_need_kcal × intake_factor_percent / 100

carbohydrates_g =
  intake_target_kcal / 4

water_l =
  carbohydrates_g / 80

sodium_mg =
  water_l × 500
```

Elevation loss shall not affect any nutrition calculation.

Display rounding shall be:

- Energy need: nearest 10 kcal.
- Intake target: nearest 10 kcal.
- Carbohydrates: nearest 1 g.
- Water: nearest 0.1 L.
- Sodium: nearest 1 mg.

All results shall be labelled as targets, except total energy need, which shall be labelled as an estimate.

Overall values shall be calculated from the unsegmented course totals. Segment values shall be calculated independently from each segment's distance and elevation gain. Apparent differences between a displayed overall value and the sum of displayed segment values due solely to display rounding are acceptable.

## 3. Results

The results view shall contain:

### Race summary

- Race name.
- Total distance.
- Total elevation gain.
- Total elevation loss.
- Total finishing time.

### Overall nutrition

- Total energy need.
- Intake target and selected intake percentage.
- Carbohydrate target.
- Water target.
- Sodium target.

### Segment plan

Each row shall show:

- From and to locations.
- Segment distance.
- Elevation gain.
- Elevation loss.
- Segment time.
- Whether the destination is water-only.
- Energy need.
- Intake target.
- Carbohydrate target.
- Water target.
- Sodium target.

Segment nutrition is the amount intended to be consumed after leaving the segment's starting location and before reaching its destination.

The results shall include a visible disclaimer stating that calculations are planning estimates, individual nutrition and hydration requirements vary, and the application does not provide medical advice.

## 4. Localization

The application shall support German and English.

- Initial language is selected from the browser language.
- Unsupported browser languages fall back to English.
- The user can switch language at any time.
- Switching language preserves all inputs and calculated state.
- Labels, validation messages, default station names, units, result headings, and the disclaimer shall be localized.
- User-entered names shall never be translated.

Metric units shall be used exclusively: kg, km, m, L, mg, g, and kcal.

## 5. Persistence and privacy

The application shall store valid application state in browser-local storage and restore it after refresh, including:

- Language selection.
- Race and athlete inputs.
- Intake percentage.
- Expected and overridden times.
- Aid stations.
- Manual course data.
- Processed GPX course points sufficient to restore the course without selecting the file again.

The application shall not upload or transmit athlete, race, or GPX data. Clearing site data may remove the saved plan.

If restored data is incompatible with the current application version or fails validation, the application shall discard only the invalid state and explain that it could not be restored.

## 6. Validation and incomplete states

Calculation and results shall be unavailable until all required inputs are valid.

At minimum, the application shall reject:

- Empty race name.
- Weight outside 40–150 kg or a non-whole weight.
- Intake percentage outside 1–100% or a non-whole percentage.
- Missing, zero, or negative course distance.
- Negative elevation gain or loss.
- Non-whole elevation values.
- Missing or invalid finishing time.
- Zero total course effort.
- Stations at or outside the course endpoints.
- Duplicate station kilometres.
- Missing required manual segment values.
- Invalid or unsupported GPX structures.

Validation messages shall identify the field or file problem and describe how to correct it.

## 7. Responsive behavior and accessibility

The interface shall be usable on mobile and desktop viewports.

- Primary inputs and actions shall not require horizontal scrolling.
- The segment results may use responsive cards or an intentionally scrollable table on narrow screens.
- Form controls shall have visible labels and touch-friendly targets.
- Validation shall not rely on colour alone.
- Keyboard navigation and visible focus states shall be supported.
- Semantic HTML shall be used for forms, headings, status messages, and tabular data.

## 8. Version 1 acceptance criteria

### AC-1 Reference energy calculation

Given an athlete weighing 80 kg  
And a 10 km course with 1,000 m elevation gain  
When results are calculated  
Then total energy need is 1,600 kcal.

### AC-2 Default nutrition chain

Given the AC-1 course  
And the default 30% intake factor  
Then intake target is 480 kcal  
And carbohydrate target is 120 g  
And water target is 1.5 L  
And sodium target is 750 mg.

### AC-3 Descent exclusion

Given two otherwise identical courses with different elevation loss  
Then their energy and nutrition results are identical.

### AC-4 Segment totals

Given a course split into multiple segments  
Then each segment uses its own distance and elevation gain  
And nutrition is presented for consumption between its start and destination.

### AC-5 Time allocation

Given a total finishing time and multiple segments  
When no segment time is overridden  
Then time is allocated in proportion to segment effort  
And rounded segment minutes sum exactly to the entered finishing time.

### AC-6 Time override

Given calculated segment times  
When the user overwrites one segment time  
Then total finishing time becomes the sum of segment times  
And it is read-only until the user explicitly enters a new total time.

### AC-7 GPX segmentation

Given a valid single-track or single-route GPX course  
When an aid station is added at a valid race kilometre  
Then segment distance, elevation gain, and elevation loss are derived from GPX data  
And those values cannot be edited.

### AC-8 GPX rejection

Given a GPX file with missing elevation, multiple tracks or routes, multiple track segments, or no track/route  
When it is selected  
Then the application explains the problem  
And blocks calculation until the course input is corrected.

### AC-9 Manual segmentation

Given a manually entered Start-to-Finish course  
When an intermediate station is added  
Then the user supplies ascent and descent for both resulting segments  
And course ascent and descent become the sum of segment values.

### AC-10 Aid-station validation

Given an existing station kilometre  
Then another station cannot use that kilometre  
And no intermediate station can be placed at or beyond either course endpoint.

### AC-11 Water-only station

Given a station marked water-only  
Then its status is visible in the segment result  
And calculated nutrition values remain unchanged.

### AC-12 Immediate recalculation

Given a complete valid plan  
When weight, intake factor, course geometry, or an aid station changes  
Then affected results update without a Calculate action.

### AC-13 Localization

Given a supported German browser locale  
When the application opens for the first time  
Then German is selected  
And switching to English preserves all entered values.

### AC-14 Persistence

Given a valid plan created from manual data or a GPX file  
When the page is refreshed  
Then the plan is restored without reselecting the GPX file.

### AC-15 Privacy

Given any entered plan or GPX course  
Then processing and persistence occur locally  
And no plan or course data is transmitted.

### AC-16 Mobile usability

Given a narrow mobile viewport  
Then all inputs and primary actions remain usable without page-level horizontal scrolling.

## 9. Deferred decisions

The following require implementation-level decisions and do not change product behavior:

- Front-end framework and build tooling.
- Exact visual design.
- GPX parsing library.
- Geodesic distance algorithm implementation.
- Local-storage schema and migration strategy.
