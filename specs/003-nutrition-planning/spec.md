# Nutrition Planning — Feature Specification

Status: Draft  
Target platform: Existing static web application hosted on GitHub Pages  
Depends on: Race Nutrition Calculator version 1 and Nutrition Master Data

## 1. Purpose and terminology

The application shall let a user create an actual nutrition plan for a valid
race plan. Nutrition options are assigned to course segments as whole
servings. A plan may be created automatically and then edited manually, or
created entirely through manual assignments.

- **Assignment:** A nutrition option and its whole-number serving count in one
  segment.
- **Planned intake:** The nutrient totals contributed by all assignments.
- **Target:** The carbohydrate, water, and sodium requirement calculated by the
  Race Nutrition Calculator.
- **Delta:** The signed difference between planned intake and target
  (`planned - target`).
- **Raw shortfall:** The positive difference between a target and planned
  intake before the nutrient-specific tolerance is applied.
- **Reportable shortfall:** A raw shortfall that is at least the
  nutrient-specific tolerance.
- **Unavailable assignment:** An existing assignment whose nutrition option is
  currently marked unavailable in the catalogue.

All planning and optimization shall run locally in the browser.

## 2. Preconditions

Nutrition planning shall be available only when:

- the race calculator has a valid calculated plan;
- at least one course segment exists; and
- the nutrition catalogue has been initialized.

An empty catalogue or a catalogue without available options shall still permit
viewing and manual correction of an existing nutrition plan, but automatic
planning shall be unavailable and the reason shall be shown.

## 3. Plan data

Each assignment shall contain:

- the segment identifier;
- the nutrition-option identifier; and
- a non-negative whole-number serving count.

Zero servings are equivalent to no assignment and shall not be persisted.
Fractional and negative serving counts are invalid.

Each nutrition option may be assigned at most once per segment. The same option
may be assigned to any number of different segments.

Products shall always be assigned to a segment, never only to the overall race
or directly to an aid station. An assignment means that its servings are
intended to be consumed after leaving the segment's starting location and
before reaching its destination.

## 4. Nutrient totals and shortfalls

For every segment and for the complete course, the application shall calculate
planned totals from whole servings:

```text
planned_carbohydrates_g =
  sum(servings × option.carbohydrates_g)

planned_water_l =
  sum(servings × option.water_l)

planned_sodium_mg =
  sum(servings × option.sodium_mg)
```

The application shall compare each planned total with its corresponding
unrounded calculator target:

```text
raw_shortfall = max(target - planned, 0)
surplus = max(planned - target, 0)
```

The following thresholds shall suppress small raw shortfalls:

- Water below 0.1 L.
- Carbohydrates below 5 g.
- Sodium below 20 mg.

A raw shortfall below its threshold shall be treated as zero for segment and
course status and automatic optimization. A raw shortfall equal to or above
its threshold shall affect the corresponding status. Because only whole
servings are permitted, an exact match is not guaranteed. The comparison table
specified in section 8 shall display the signed delta instead of separate
shortfall and surplus values.

Overall planned totals shall be the sums of the segment assignments. Overall
shortfalls shall compare those totals with the calculator's overall targets,
not with the sum of rounded displayed segment targets.

## 5. Manual planning

The user shall be able to:

- add any currently available catalogue option to a segment;
- change its serving count using whole numbers;
- remove an assignment;
- retain and edit assignments of currently unavailable options; and
- clear all assignments after confirmation.

New manual assignments shall be selected only from currently available
catalogue options. Unavailable options already assigned to the plan shall
remain visible, editable, and clearly labelled unavailable.

Manual serving counts shall have no business-defined upper limit other than
JavaScript's safe integer limit. Entering zero servings shall immediately
remove the assignment. Manual plans are not constrained by the automatic
planner's surplus limit.

Every manual change shall immediately update segment totals, overall totals,
shortfalls, surpluses, and total product quantities.

Assignments and serving counts shall be edited directly in the corresponding
segment view without requiring a separate dialog.

## 6. Automatic planning

The user shall be able to generate a complete plan from the currently available
nutrition options. Automatic generation shall replace existing assignments only
after the user has confirmed that manual changes will be lost.

The generator shall use whole servings and optimize the complete plan across
all segments. Segment targets remain independent: nutrient shortfalls and
surpluses shall be calculated per segment and then summed for candidate
comparison. The generator shall compare complete candidate plans
lexicographically in this priority order:

1. smallest total reportable water shortfall;
2. smallest total reportable carbohydrate shortfall;
3. smallest total reportable sodium shortfall;
4. smallest total water surplus;
5. smallest total carbohydrate surplus;
6. smallest total sodium surplus;
7. fewest per-segment violations of the preference for at most two distinct
   water-contributing options;
8. greatest number of distinct nutrition options across the complete plan;
9. fewest repeated uses of the same option in consecutive segments;
10. smallest total number of servings; and
11. deterministic nutrition-option identifier order.

This ordering makes water more important than carbohydrates and carbohydrates
more important than sodium. Nutrient coverage and low surplus take precedence
over variety. A lower-priority improvement shall never be chosen at the cost
of a worse higher-priority result.

For automatic planning, every nutrient in every segment shall satisfy:

```text
planned_nutrient <= 2 × target_nutrient
```

The resulting surplus can therefore never exceed that segment's actual target
for the nutrient. This is a hard candidate constraint. Within this constraint,
the generator shall eliminate all reportable shortfalls when mathematically
possible. Otherwise, it shall return the best candidate according to the
priority order and clearly mark its remaining undercoverage.

At most two distinct options with a positive water quantity per serving are
preferred in each segment. This is a soft optimization preference rather than
a validity constraint.

Options that contribute zero water, zero carbohydrates, and zero sodium shall
not be used by automatic planning. Unavailable options shall not be used for a
new automatic plan.

Automatic generation shall terminate within 10 seconds for the supported
catalogue and segment sizes. If no candidate can contribute to a required
nutrient, the generator shall still return its best plan and display the
remaining reportable shortfall. If the optimization cannot complete within
10 seconds, it shall abort, explain the failure, and leave all existing
assignments unchanged. It shall not install a partial or not-yet-proven-best
result.

While automatic generation is running, the application shall clearly indicate
the ongoing calculation with a visible indeterminate loading indicator and
localized status text. The planning region shall expose its busy state to
assistive technology. The user shall be able to cancel the calculation, and
duplicate generation requests shall be prevented until it completes, times
out, or is cancelled.

After generation, every assignment shall be manually editable.

Automatic generation shall always cover all segments. It shall not be
available for an individual segment. Re-running it shall replace every manual
and previously generated assignment after confirmation; assignments cannot be
locked or preserved during regeneration.

## 7. Catalogue changes and plan reconciliation

Assignments shall reference nutrition options by their stable identifiers.
Standard-option identifiers shall remain stable across catalogue versions
when the row represents the same logical product. They shall not incorporate
the catalogue version. A changed standard option retaining its identifier is
an update; a missing identifier is a deletion.

- When an assigned option's nutrient data or name changes, all calculations and
  displays in the plan shall immediately use the updated catalogue data.
- When an assigned option becomes unavailable, its assignments shall remain and
  shall be labelled unavailable.
- When an assigned option is deleted, its assignments shall be removed from all
  segments immediately without a separate warning or confirmation.
- When catalogue replacement removes an option, it shall be treated as a
  deletion.
- When catalogue replacement retains an option with the same stable identifier,
  its assignments shall remain and use the replacement data.

Catalogue reconciliation shall not silently substitute a different option.

## 8. Results and product totals

The planning view shall show for each segment:

- from and to locations;
- assigned options and serving counts;
- a table with the columns category, target, plan, and delta;
- carbohydrate, water, and sodium as the table categories; and
- unavailable status for affected assignments.

Delta shall be calculated as plan minus target and displayed with its sign. A
positive or negative delta whose absolute value is more than 5% of the target
shall be highlighted in yellow. A positive or negative delta whose absolute
value is more than 20% of the target shall instead be highlighted in red.
Exactly 5% shall not be highlighted, and exactly 20% shall be highlighted in
yellow. Any non-zero plan for a zero target shall be highlighted in red.

Each segment shall have a text status that distinguishes:

- covered;
- undercovered; and
- contains an unavailable assigned option.

More than one status may apply. Status shall be based on reportable
shortfalls, not suppressed raw shortfalls.

The complete-course summary shall show:

- an overall table with category, target, plan, and delta using the same
  categories and highlighting rules; and
- whether any segment has a shortfall.

The application shall also show a complete-course product summary containing
each assigned option and the sum of its servings across all segments.
Unavailable assigned options shall remain included and visibly marked.
The summary shall show serving counts only and shall not repeat a per-segment
breakdown or product nutrient totals.

## 9. Course and calculator changes

When calculator inputs change but segment identifiers remain unchanged, the
assignments shall remain and all comparisons shall be recalculated. Moving an
aid station while retaining its adjacent segment identifiers shall therefore
preserve their assignments.

When adding an aid station splits a segment, the assignments of the removed
segment shall be deleted and both new segments shall start without
assignments. When deleting an aid station combines two adjacent segments, the
assignments from both removed segments shall be merged into the new segment;
serving counts for the same option shall be added. Any other newly added
segment shall start without assignments. The application shall not otherwise
move assignments between segments.

Automatic regeneration after calculator or course changes shall require an
explicit user action and shall not overwrite manual changes silently.

## 10. Persistence and privacy

The nutrition plan shall be stored in the existing versioned IndexedDB database
and restored with the related race plan. The application shall maintain one
nutrition plan for the current race plan; alternative named versions are not
supported. Data shall not be uploaded or transmitted.

If the race plan temporarily becomes invalid, nutrition assignments shall
remain stored but planning calculations and editing shall be unavailable until
the race plan is valid again.

If storage fails, planning shall remain usable in memory for the current page
session and a localized warning shall explain that changes may not persist.
Invalid stored assignments shall be discarded individually where possible
without discarding an otherwise valid race or nutrition plan.

Clearing the nutrition plan after confirmation shall remove all assignments
and planning-specific state. Reconciliation and course-change notices shall be
transient status messages and shall not require acknowledgement.

## 11. Localization, accessibility, and responsive behavior

All planning labels, actions, nutrient states, table headings, confirmations,
warnings, and validation messages shall be available in German and English.
Product and user-entered segment names shall not be translated.

The planning view shall be usable on mobile and desktop. All controls shall be
keyboard operable with visible focus. Delta direction and unavailable products
shall not be communicated by colour alone; the signed delta value and text
status shall remain available. Status changes and reconciliation notices shall
be announced to assistive technology. The automatic-planning loading indicator
shall not rely on animation alone: localized status text and the planning
region's programmatic busy state shall also communicate that calculation is in
progress.

## 12. Acceptance criteria

### AC-1 Manual segment planning

Given a valid calculated race and initialized catalogue  
When the user assigns whole servings of options to a segment  
Then planned nutrient totals update immediately  
And fractional or negative servings cannot be stored.

### AC-2A Exact shortfall reporting

Given a segment's planned intake is below any unrounded target  
When the raw shortfall is at least 0.1 L water, 5 g carbohydrates, or 20 mg
sodium respectively  
Then the segment is undercovered and the delta shows the signed difference
But a raw shortfall below the corresponding threshold is treated as zero.

### AC-2B Nutrition comparison table

Given nutrition targets and planned intake exist for a segment or the complete
course
When the nutrition comparison is displayed
Then it is a table with the headings category, target, plan, and delta
And it contains the categories carbohydrate, water, and sodium
And delta is displayed as the signed result of plan minus target
And an absolute delta of exactly 5% of target is not highlighted
And an absolute delta greater than 5% and up to 20% of target is highlighted
in yellow
And an absolute delta greater than 20% of target is highlighted in red
And any non-zero plan for a zero target is highlighted in red.

### AC-3 Automatic planning priorities

Given multiple possible whole-serving plans  
When an automatic plan is generated  
Then it uses only available options  
And it minimizes shortfalls and surpluses using the specified lexicographic
water, carbohydrate, and sodium priority order  
And no automatically planned nutrient exceeds twice its segment target  
And variety is optimized only after nutrient shortfall and surplus
And a visible loading indicator and localized status text remain present while
the calculation is running
And the calculation completes or aborts after at most 10 seconds
And a timeout leaves all existing assignments unchanged.

### AC-4 Automatic-plan replacement

Given assignments already exist  
When automatic generation is requested  
Then confirmation is required before replacing them  
And every existing assignment is replaced  
And the resulting assignments remain manually editable.

### AC-5 Unavailable option retention

Given an assigned option becomes unavailable  
Then all its assignments remain  
And every occurrence and the product summary clearly identify it as
unavailable  
And a newly generated plan does not use it.

### AC-6 Option update and deletion

Given an assigned option is edited  
Then its updated name and nutrients are used throughout the plan  
When an assigned option is deleted  
Then all its assignments are removed immediately without separate
confirmation.

### AC-7 Product summary

Given an option is assigned to multiple segments  
Then the complete-course product summary shows that option once  
And its quantity equals the sum of servings across all segments.

### AC-8 Course changes

Given assignments exist  
When targets change without changing segment identifiers  
Then assignments remain and comparisons are recalculated  
When a segment is removed  
Then splitting it removes its assignments  
And combining adjacent segments merges their assignments into the resulting
segment.

### AC-9 Persistence and privacy

Given a nutrition plan exists  
When the application is refreshed  
Then valid assignments are restored with the race plan  
And no planning or catalogue data is transmitted.

### AC-10 Localization and accessibility

Given the language or viewport changes or the application is operated by
keyboard  
Then the plan remains usable and unchanged  
And delta direction, threshold severity, and unavailable states remain
perceivable without relying on colour alone.

## 13. Out of scope

- Fractional servings.
- Assignments directly to aid stations or only to the complete course.
- Planning water outside catalogue options.
- Inventory, package counts, prices, or shopping costs.
- Weather, sweat-rate, dietary, allergy, or medical recommendations.
- Server-side optimization, accounts, synchronization, or sharing.
- Exporting or printing plans.
- Multiple saved nutrition-plan variants for one race.
