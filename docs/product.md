# Ultra Race Nutrition Calculator

## Product vision

Ultra Race Nutrition Calculator helps ultrarunners estimate and plan race nutrition from course distance, elevation gain, body weight, and aid-station locations.

The application is a public, account-free web application hosted on GitHub Pages. All course processing and persistence happen locally in the browser. No race or athlete data is uploaded.

## Primary user

An ultrarunner preparing a nutrition plan for an ultra-trail race.

## Core user journey

1. Enter a race name and athlete weight.
2. Upload a GPX course or enter the course values manually.
3. Review total distance, elevation gain, and elevation loss.
4. Enter the expected finishing time and intake percentage.
5. Add and edit aid stations, including whether each is water-only.
6. Review overall and segment-by-segment nutrition targets.

## Version 1 scope

- GPX track and route import.
- Manual course entry.
- Metric units.
- Aid-station management.
- Overall and per-segment time and nutrition calculations.
- German and English interfaces.
- Browser-local persistence.
- Responsive, mobile-usable interface.

## Non-goals

- User accounts or server-side storage.
- Hourly nutrition targets.
- Product or food recommendations.
- Recording food available at aid stations.
- Adjustments for descent, weather, temperature, terrain, or individual sweat rate.
- Exporting or printing plans.
- Medical or dietary advice.

## Success criterion

For a 10 km course with 1,000 m elevation gain and an 80 kg athlete, total energy need is 1600 kcal:

`80 × (10 + 1000 ÷ 100) = 1600`
