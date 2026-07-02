import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { appReducer } from "./appReducer";
import { courseGeometry, selectPlan } from "./selectors";
import {
  FINISH_ID,
  START_ID,
  createDefaultPlan,
  segmentId,
  type AidStation,
  type CourseGeometry,
  type GpxCourse,
  type ManualCourse,
  type NutritionResult,
  type RacePlan,
} from "../domain/model";
import {
  initialManualSegment,
  mergeManualSegments,
  sortStations,
  splitManualSegment,
} from "../domain/segmentation";
import { formatDuration, parseDuration } from "../domain/timeAllocation";
import { roundNutrition } from "../domain/nutrition";
import { GpxError, type GpxErrorCode } from "../gpx/gpxErrors";
import { parseGpx } from "../gpx/parseGpx";
import { detectLanguage, formatNumber, messages } from "../i18n/locale";
import { loadPlan, savePlan } from "../persistence/planRepository";
import { NutritionCataloguePage } from "../catalogue/NutritionCataloguePage";

type Notice = "restored" | "restoreFailed" | "storageFailed" | null;

interface StationDraft {
  editingId: string | null;
  name: string;
  kilometer: string;
  waterOnly: boolean;
  beforeAscent: string;
  beforeDescent: string;
  afterAscent: string;
  afterDescent: string;
}

const emptyStationDraft: StationDraft = {
  editingId: null,
  name: "",
  kilometer: "",
  waterOnly: false,
  beforeAscent: "0",
  beforeDescent: "0",
  afterAscent: "0",
  afterDescent: "0",
};

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stationMap(
  plan: RacePlan,
  distanceKm: number,
): Record<string, number> {
  return {
    [START_ID]: 0,
    [FINISH_ID]: distanceKm,
    ...Object.fromEntries(
      plan.stations.map((station) => [station.id, station.kilometer]),
    ),
  };
}

function defaultStationName(
  index: number,
  language: RacePlan["language"],
): string {
  return language === "de"
    ? `Verpflegungsstation ${index}`
    : `Aid station ${index}`;
}

function renumberDefaultStations(
  stations: AidStation[],
  language: RacePlan["language"],
): AidStation[] {
  return sortStations(stations).map((station, index) =>
    station.nameSource === "default"
      ? { ...station, name: defaultStationName(index + 1, language) }
      : station,
  );
}

function nutritionItems(
  result: NutritionResult,
  language: RacePlan["language"],
  m: ReturnType<typeof messages>,
) {
  const rounded = roundNutrition(result);
  return [
    [m.energyNeed, formatNumber(rounded.energyNeedKcal, language), m.kcal],
    [m.intakeTarget, formatNumber(rounded.intakeTargetKcal, language), m.kcal],
    [m.carbohydrates, formatNumber(rounded.carbohydratesG, language), m.gram],
    [
      m.water,
      formatNumber(rounded.waterL, language, { minimumFractionDigits: 1 }),
      m.liter,
    ],
    [m.sodium, formatNumber(rounded.sodiumMg, language), m.milligram],
  ] as const;
}

export function App() {
  const initialLanguage = detectLanguage();
  const [plan, dispatch] = useReducer(
    appReducer,
    createDefaultPlan(initialLanguage),
  );
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [gpxError, setGpxError] = useState<GpxErrorCode | null>(null);
  const [processingGpx, setProcessingGpx] = useState(false);
  const [stationDraft, setStationDraft] = useState<StationDraft | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [newTotalMode, setNewTotalMode] = useState(false);
  const [newTotalValue, setNewTotalValue] = useState("");
  const [page, setPage] = useState<"calculator" | "catalogue">("calculator");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const m = messages(plan.language);

  useEffect(() => {
    let active = true;
    void loadPlan()
      .then((saved) => {
        if (!active) return;
        if (saved) {
          dispatch({ type: "replace", plan: saved });
          setNotice("restored");
        }
      })
      .catch(() => {
        if (active) setNotice("restoreFailed");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void savePlan(plan).catch(() => setNotice("storageFailed"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [plan, ready]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      void savePlan(plan).catch(() => setNotice("storageFailed"));
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [plan, ready]);

  const selection = useMemo(
    () => selectPlan(plan, { start: m.start, finish: m.finish }),
    [plan, m.start, m.finish],
  );
  const geometry = courseGeometry(plan);
  const issueByField = new Map(
    selection.issues.map((issue) => [issue.fieldPath, issue.code]),
  );
  const hasOverrides = Object.keys(plan.segmentTimeOverrides).length > 0;

  function patch(patchValue: Partial<RacePlan>) {
    dispatch({ type: "patch", patch: patchValue });
  }

  function changeLanguage(language: RacePlan["language"]) {
    patch({
      language,
      stations: renumberDefaultStations(plan.stations, language),
    });
    document.documentElement.lang = language;
  }

  function switchMode(mode: RacePlan["courseMode"]) {
    if (mode === plan.courseMode) return;
    patch({
      courseMode: mode,
      course: null,
      stations: [],
      segmentTimeOverrides: {},
      timingMode: "allocated",
    });
    setGpxError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setManualGeometry(field: keyof CourseGeometry, raw: string) {
    const value = numberOrNull(raw);
    const current =
      plan.course?.mode === "manual" && plan.course.segments.length === 1
        ? plan.course.segments[0]!
        : initialManualSegment({ distanceKm: 0, ascentM: 0, descentM: 0 });
    const updated = { ...current, [field]: value ?? 0 };
    patch({
      course: { mode: "manual", segments: [updated] },
      stations: [],
      segmentTimeOverrides: {},
    });
  }

  async function handleGpx(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessingGpx(true);
    setGpxError(null);
    try {
      const parsed = parseGpx(await file.text());
      const course: GpxCourse = {
        mode: "gpx",
        id: crypto.randomUUID(),
        ...parsed,
      };
      patch({
        course,
        stations: [],
        segmentTimeOverrides: {},
        timingMode: "allocated",
      });
    } catch (error) {
      setGpxError(error instanceof GpxError ? error.code : "gpx.invalidXml");
      patch({ course: null, stations: [], segmentTimeOverrides: {} });
    } finally {
      setProcessingGpx(false);
    }
  }

  function openAddStation() {
    const index = plan.stations.length + 1;
    setStationError(null);
    setStationDraft({
      ...emptyStationDraft,
      name: defaultStationName(index, plan.language),
    });
  }

  function openEditStation(station: AidStation) {
    const segments = selection.segmentGeometry;
    const before = segments.find((segment) => segment.toId === station.id);
    const after = segments.find((segment) => segment.fromId === station.id);
    setStationError(null);
    setStationDraft({
      editingId: station.id,
      name: station.name,
      kilometer: String(station.kilometer),
      waterOnly: station.waterOnly,
      beforeAscent: String(Math.round(before?.ascentM ?? 0)),
      beforeDescent: String(Math.round(before?.descentM ?? 0)),
      afterAscent: String(Math.round(after?.ascentM ?? 0)),
      afterDescent: String(Math.round(after?.descentM ?? 0)),
    });
  }

  function saveStation(event: FormEvent) {
    event.preventDefault();
    if (!stationDraft || !geometry) return;
    const kilometer = numberOrNull(stationDraft.kilometer);
    const otherStations = plan.stations.filter(
      (station) => station.id !== stationDraft.editingId,
    );
    if (
      kilometer === null ||
      kilometer <= 0 ||
      kilometer >= geometry.distanceKm ||
      otherStations.some((station) => station.kilometer === kilometer)
    ) {
      setStationError(
        otherStations.some((station) => station.kilometer === kilometer)
          ? m.validation.stationDuplicate
          : m.validation.stationRange,
      );
      return;
    }
    if (!stationDraft.name.trim()) {
      setStationError(m.validation.required);
      return;
    }

    const existing = plan.stations.find(
      (station) => station.id === stationDraft.editingId,
    );
    const nextStation: AidStation = {
      id: existing?.id ?? crypto.randomUUID(),
      name: stationDraft.name.trim(),
      nameSource:
        existing?.nameSource === "default" &&
        stationDraft.name === existing.name
          ? "default"
          : !existing &&
              stationDraft.name ===
                defaultStationName(plan.stations.length + 1, plan.language)
            ? "default"
            : "custom",
      kilometer,
      waterOnly: stationDraft.waterOnly,
    };

    let nextCourse = plan.course;
    if (plan.course?.mode === "manual") {
      const elevationValues = [
        stationDraft.beforeAscent,
        stationDraft.beforeDescent,
        stationDraft.afterAscent,
        stationDraft.afterDescent,
      ].map(numberOrNull);
      if (
        elevationValues.some(
          (value) => value === null || !Number.isInteger(value) || value < 0,
        )
      ) {
        setStationError(m.validation.elevationWhole);
        return;
      }
      let baseSegments = plan.course.segments;
      let baseStations = plan.stations;
      if (existing) {
        baseSegments = mergeManualSegments(baseSegments, existing.id);
        baseStations = baseStations.filter(
          (station) => station.id !== existing.id,
        );
      }
      const kilometers = {
        ...stationMap({ ...plan, stations: baseStations }, geometry.distanceKm),
        [nextStation.id]: kilometer,
      };
      try {
        const segments = splitManualSegment(
          baseSegments,
          nextStation,
          { ascentM: elevationValues[0]!, descentM: elevationValues[1]! },
          { ascentM: elevationValues[2]!, descentM: elevationValues[3]! },
          kilometers,
        );
        nextCourse = { mode: "manual", segments };
      } catch {
        setStationError(m.validation.stationRange);
        return;
      }
    }

    const stations = renumberDefaultStations(
      [...otherStations, nextStation],
      plan.language,
    );
    patch({
      course: nextCourse,
      stations,
      segmentTimeOverrides: {},
      timingMode: "allocated",
    });
    setStationDraft(null);
  }

  function deleteStation(station: AidStation) {
    let nextCourse = plan.course;
    let nextOverrides: Record<string, number> = {};
    let nextTimingMode: RacePlan["timingMode"] = "allocated";
    if (plan.course?.mode === "manual") {
      const left = selection.result?.segments.find(
        (segment) => segment.toId === station.id,
      );
      const right = selection.result?.segments.find(
        (segment) => segment.fromId === station.id,
      );
      nextCourse = {
        mode: "manual",
        segments: mergeManualSegments(plan.course.segments, station.id),
      } satisfies ManualCourse;
      if (
        selection.result &&
        left?.durationMinutes !== null &&
        left?.durationMinutes !== undefined &&
        right?.durationMinutes !== null &&
        right?.durationMinutes !== undefined
      ) {
        nextOverrides = Object.fromEntries(
          selection.result.segments
            .filter(
              (segment) => segment.id !== left.id && segment.id !== right.id,
            )
            .filter((segment) => segment.durationMinutes !== null)
            .map((segment) => [segment.id, segment.durationMinutes!]),
        );
        nextOverrides[segmentId(left.fromId, right.toId)] =
          left.durationMinutes + right.durationMinutes;
        nextTimingMode = "overridden";
      }
    }
    patch({
      course: nextCourse,
      stations: renumberDefaultStations(
        plan.stations.filter((item) => item.id !== station.id),
        plan.language,
      ),
      segmentTimeOverrides: nextOverrides,
      timingMode: nextTimingMode,
    });
  }

  function commitNewTotal(event: FormEvent) {
    event.preventDefault();
    const minutes = parseDuration(newTotalValue);
    if (minutes === null) return;
    patch({
      enteredFinishMinutes: minutes,
      segmentTimeOverrides: {},
      timingMode: "allocated",
    });
    setNewTotalMode(false);
  }

  const summary = selection.result;

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div>
            <p className="eyebrow">ULTRA · TRAIL · PLAN</p>
            <h1>{m.appName}</h1>
            <p className="tagline">{m.tagline}</p>
          </div>
          <label className="language-control">
            <span>{m.language}</span>
            <select
              value={plan.language}
              onChange={(event) =>
                changeLanguage(event.target.value as RacePlan["language"])
              }
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </label>
        </div>
        <nav
          className="top-navigation"
          aria-label={
            plan.language === "de" ? "Hauptnavigation" : "Main navigation"
          }
        >
          <button
            type="button"
            aria-current={page === "calculator" ? "page" : undefined}
            onClick={() => setPage("calculator")}
          >
            {plan.language === "de" ? "Rechner" : "Calculator"}
          </button>
          <button
            type="button"
            aria-current={page === "catalogue" ? "page" : undefined}
            onClick={() => setPage("catalogue")}
          >
            {plan.language === "de"
              ? "Verpflegungsoptionen"
              : "Nutrition options"}
          </button>
        </nav>
      </header>

      <main>
        {page === "catalogue" ? (
          <NutritionCataloguePage language={plan.language} />
        ) : (
          <>
            {notice && (
              <div
                className={`notice ${notice === "storageFailed" ? "notice-error" : ""}`}
                role="status"
              >
                {m[notice]}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setNotice(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            )}

            <section className="panel">
              <div className="section-heading">
                <span className="step">01</span>
                <h2>{m.raceDetails}</h2>
              </div>
              <div className="form-grid">
                <Field
                  label={m.raceName}
                  error={
                    issueByField.get("raceName")
                      ? m.validation.required
                      : undefined
                  }
                >
                  <input
                    value={plan.raceName}
                    onChange={(event) =>
                      patch({ raceName: event.target.value })
                    }
                    required
                  />
                </Field>
                <Field
                  label={`${m.weight} (${m.weightUnit})`}
                  error={
                    issueByField.get("weightKg")
                      ? m.validation.weightRange
                      : undefined
                  }
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min="40"
                    max="150"
                    step="1"
                    value={plan.weightKg ?? ""}
                    onChange={(event) =>
                      patch({ weightKg: numberOrNull(event.target.value) })
                    }
                  />
                </Field>
                <Field
                  label={`${m.intake} (%)`}
                  help={m.intakeHelp}
                  error={
                    issueByField.get("intakePercent")
                      ? m.validation.percentRange
                      : undefined
                  }
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="100"
                    step="1"
                    value={plan.intakePercent}
                    onChange={(event) =>
                      patch({
                        intakePercent: numberOrNull(event.target.value) ?? 0,
                      })
                    }
                  />
                </Field>
                <Field
                  label={hasOverrides ? m.currentTotalTime : m.finishTime}
                  help={m.timeHelp}
                  error={
                    issueByField.get("finishTime")
                      ? m.validation.duration
                      : undefined
                  }
                >
                  <input
                    key={`finish-${hasOverrides}-${plan.enteredFinishMinutes}-${summary?.totalMinutes ?? ""}`}
                    inputMode="numeric"
                    placeholder="14:30"
                    readOnly={hasOverrides}
                    defaultValue={
                      hasOverrides && summary
                        ? formatDuration(summary.totalMinutes)
                        : plan.enteredFinishMinutes === null
                          ? ""
                          : formatDuration(plan.enteredFinishMinutes)
                    }
                    onBlur={(event) => {
                      if (!hasOverrides)
                        patch({
                          enteredFinishMinutes: parseDuration(
                            event.target.value,
                          ),
                        });
                    }}
                  />
                </Field>
              </div>
              {hasOverrides && !newTotalMode && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setNewTotalValue(
                      summary ? formatDuration(summary.totalMinutes) : "",
                    );
                    setNewTotalMode(true);
                  }}
                >
                  {m.setNewTotal}
                </button>
              )}
              {newTotalMode && (
                <form className="inline-form" onSubmit={commitNewTotal}>
                  <input
                    aria-label={m.finishTime}
                    value={newTotalValue}
                    onChange={(event) => setNewTotalValue(event.target.value)}
                    placeholder="14:30"
                  />
                  <button className="button" type="submit">
                    {m.save}
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setNewTotalMode(false)}
                  >
                    {m.cancel}
                  </button>
                </form>
              )}
            </section>

            <section className="panel">
              <div className="section-heading">
                <span className="step">02</span>
                <h2>{m.course}</h2>
              </div>
              <div className="segmented-control" aria-label={m.course}>
                <button
                  type="button"
                  aria-pressed={plan.courseMode === "manual"}
                  onClick={() => switchMode("manual")}
                >
                  {m.manual}
                </button>
                <button
                  type="button"
                  aria-pressed={plan.courseMode === "gpx"}
                  onClick={() => switchMode("gpx")}
                >
                  {m.gpx}
                </button>
              </div>

              {plan.courseMode === "manual" ? (
                <div className="form-grid course-inputs">
                  <Field
                    label={`${m.distance} (${m.distanceUnit})`}
                    error={
                      issueByField.get("course.distanceKm")
                        ? m.validation.distancePositive
                        : undefined
                    }
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      disabled={plan.stations.length > 0}
                      value={geometry?.distanceKm || ""}
                      onChange={(event) =>
                        setManualGeometry("distanceKm", event.target.value)
                      }
                    />
                  </Field>
                  <Field label={`${m.ascent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      disabled={plan.stations.length > 0}
                      value={geometry?.ascentM ?? ""}
                      onChange={(event) =>
                        setManualGeometry("ascentM", event.target.value)
                      }
                    />
                  </Field>
                  <Field label={`${m.descent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      disabled={plan.stations.length > 0}
                      value={geometry?.descentM ?? ""}
                      onChange={(event) =>
                        setManualGeometry("descentM", event.target.value)
                      }
                    />
                  </Field>
                </div>
              ) : (
                <div className="upload-box">
                  <input
                    ref={fileInputRef}
                    type="file"
                    aria-label={m.chooseGpx}
                    accept=".gpx,application/gpx+xml,application/xml,text/xml"
                    onChange={(event) => void handleGpx(event)}
                  />
                  {processingGpx && <p role="status">{m.processing}</p>}
                  {gpxError && (
                    <p className="field-error" role="alert">
                      {m.gpxErrors[gpxError]}
                    </p>
                  )}
                  {plan.course?.mode === "gpx" && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        patch({
                          course: null,
                          stations: [],
                          segmentTimeOverrides: {},
                        });
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                    >
                      {m.removeGpx}
                    </button>
                  )}
                </div>
              )}

              {geometry && geometry.distanceKm > 0 && (
                <GeometryStrip
                  geometry={geometry}
                  language={plan.language}
                  m={m}
                />
              )}
            </section>

            {geometry && geometry.distanceKm > 0 && (
              <section className="panel">
                <div className="section-heading with-action">
                  <div>
                    <span className="step">03</span>
                    <h2>{m.aidStations}</h2>
                  </div>
                  <button
                    className="button"
                    type="button"
                    onClick={openAddStation}
                  >
                    + {m.addStation}
                  </button>
                </div>
                {plan.stations.length === 0 ? (
                  <p className="empty-state">{m.noStations}</p>
                ) : (
                  <div className="station-list">
                    {sortStations(plan.stations).map((station) => (
                      <article className="station-item" key={station.id}>
                        <div>
                          <strong>{station.name}</strong>
                          <span>
                            km{" "}
                            {formatNumber(station.kilometer, plan.language, {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          {station.waterOnly && (
                            <span className="badge">{m.waterOnly}</span>
                          )}
                        </div>
                        <div className="item-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => openEditStation(station)}
                          >
                            {m.editStation}
                          </button>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => deleteStation(station)}
                          >
                            {m.deleteStation}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {stationDraft && geometry && (
              <StationForm
                draft={stationDraft}
                setDraft={setStationDraft}
                error={stationError}
                manual={plan.course?.mode === "manual"}
                m={m}
                onSubmit={saveStation}
                onCancel={() => setStationDraft(null)}
              />
            )}

            {summary ? (
              <section className="results" aria-live="polite">
                <div className="section-heading light-heading">
                  <span className="step">04</span>
                  <h2>{m.summary}</h2>
                </div>
                <div className="summary-grid">
                  <SummaryValue
                    label={m.distance}
                    value={formatNumber(
                      summary.geometry.distanceKm,
                      plan.language,
                      { maximumFractionDigits: 1 },
                    )}
                    unit={m.distanceUnit}
                  />
                  <SummaryValue
                    label={m.ascent}
                    value={formatNumber(
                      Math.round(summary.geometry.ascentM),
                      plan.language,
                    )}
                    unit={m.elevationUnit}
                  />
                  <SummaryValue
                    label={m.descent}
                    value={formatNumber(
                      Math.round(summary.geometry.descentM),
                      plan.language,
                    )}
                    unit={m.elevationUnit}
                  />
                  <SummaryValue
                    label={m.time}
                    value={formatDuration(summary.totalMinutes)}
                  />
                </div>

                <h3>{m.nutrition}</h3>
                <div className="nutrition-grid">
                  {nutritionItems(summary.nutrition, plan.language, m).map(
                    ([label, value, unit]) => (
                      <SummaryValue
                        key={label}
                        label={label}
                        value={value}
                        unit={unit}
                      />
                    ),
                  )}
                </div>

                <h3>{m.segmentPlan}</h3>
                <div className="segment-grid">
                  {summary.segments.map((segment) => (
                    <article className="segment-card" key={segment.id}>
                      <div className="segment-card-header">
                        <div>
                          <p className="segment-route">
                            {segment.from.name} → {segment.to.name}
                          </p>
                          <p className="segment-meta">
                            {formatNumber(segment.distanceKm, plan.language, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {m.distanceUnit}
                            {" · "}↗{" "}
                            {formatNumber(
                              Math.round(segment.ascentM),
                              plan.language,
                            )}{" "}
                            {m.elevationUnit}
                            {" · "}↘{" "}
                            {formatNumber(
                              Math.round(segment.descentM),
                              plan.language,
                            )}{" "}
                            {m.elevationUnit}
                          </p>
                        </div>
                        {segment.to.waterOnly && (
                          <span className="badge badge-light">
                            {m.waterOnly}
                          </span>
                        )}
                      </div>
                      <label className="segment-time">
                        <span>{m.timeSinceLast}</span>
                        <input
                          key={`${segment.id}-${segment.durationMinutes}`}
                          defaultValue={
                            segment.durationMinutes === null
                              ? ""
                              : formatDuration(segment.durationMinutes)
                          }
                          onBlur={(event) => {
                            const minutes = parseDuration(event.target.value);
                            if (minutes === null) return;
                            patch({
                              timingMode: "overridden",
                              segmentTimeOverrides: {
                                ...plan.segmentTimeOverrides,
                                [segment.id]: minutes,
                              },
                            });
                          }}
                        />
                      </label>
                      <dl>
                        {nutritionItems(
                          segment.nutrition,
                          plan.language,
                          m,
                        ).map(([label, value, unit]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>
                              {value} <small>{unit}</small>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  ))}
                </div>
                <aside className="disclaimer">
                  <strong>{m.disclaimerTitle}</strong>
                  <p>{m.disclaimer}</p>
                </aside>
              </section>
            ) : (
              <div className="incomplete">
                <p>{m.incompleteTitle}</p>
              </div>
            )}
          </>
        )}
      </main>
      <footer>Ultra Race Nutrition · {new Date().getFullYear()}</footer>
    </>
  );
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function GeometryStrip({
  geometry,
  language,
  m,
}: {
  geometry: CourseGeometry;
  language: RacePlan["language"];
  m: ReturnType<typeof messages>;
}) {
  return (
    <div className="geometry-strip">
      <SummaryValue
        label={m.distance}
        value={formatNumber(geometry.distanceKm, language, {
          maximumFractionDigits: 1,
        })}
        unit={m.distanceUnit}
      />
      <SummaryValue
        label={m.ascent}
        value={formatNumber(Math.round(geometry.ascentM), language)}
        unit={m.elevationUnit}
      />
      <SummaryValue
        label={m.descent}
        value={formatNumber(Math.round(geometry.descentM), language)}
        unit={m.elevationUnit}
      />
    </div>
  );
}

function SummaryValue({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="summary-value" data-value={value}>
      <span>{label}</span>
      <strong>
        {value} {unit && <small>{unit}</small>}
      </strong>
    </div>
  );
}

function StationForm({
  draft,
  setDraft,
  error,
  manual,
  m,
  onSubmit,
  onCancel,
}: {
  draft: StationDraft;
  setDraft: (draft: StationDraft | null) => void;
  error: string | null;
  manual: boolean;
  m: ReturnType<typeof messages>;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  function update(patch: Partial<StationDraft>) {
    setDraft({ ...draft, ...patch });
  }
  return (
    <div className="dialog-backdrop">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-title"
      >
        <h2 id="station-title">
          {draft.editingId ? m.editStation : m.addStationTitle}
        </h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <Field label={m.stationName}>
              <input
                value={draft.name}
                onChange={(event) => update({ name: event.target.value })}
                autoFocus
              />
            </Field>
            <Field label={`${m.stationKm} (${m.distanceUnit})`}>
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={draft.kilometer}
                onChange={(event) => update({ kilometer: event.target.value })}
              />
            </Field>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={draft.waterOnly}
              onChange={(event) => update({ waterOnly: event.target.checked })}
            />
            <span>{m.waterOnly}</span>
          </label>
          {manual && (
            <>
              <p>{m.splitGeometryHelp}</p>
              <div className="split-grid">
                <fieldset>
                  <legend>{m.beforeStation}</legend>
                  <Field label={`${m.ascent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.beforeAscent}
                      onChange={(event) =>
                        update({ beforeAscent: event.target.value })
                      }
                    />
                  </Field>
                  <Field label={`${m.descent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.beforeDescent}
                      onChange={(event) =>
                        update({ beforeDescent: event.target.value })
                      }
                    />
                  </Field>
                </fieldset>
                <fieldset>
                  <legend>{m.afterStation}</legend>
                  <Field label={`${m.ascent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.afterAscent}
                      onChange={(event) =>
                        update({ afterAscent: event.target.value })
                      }
                    />
                  </Field>
                  <Field label={`${m.descent} (${m.elevationUnit})`}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.afterDescent}
                      onChange={(event) =>
                        update({ afterDescent: event.target.value })
                      }
                    />
                  </Field>
                </fieldset>
              </div>
            </>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onCancel}
            >
              {m.cancel}
            </button>
            <button className="button" type="submit">
              {m.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
