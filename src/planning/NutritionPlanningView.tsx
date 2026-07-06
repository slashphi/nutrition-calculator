import { useEffect, useMemo, useRef, useState } from "react";
import type { NutritionOption } from "../catalogue/model";
import type {
  CalculatedPlan,
  Language,
  NutritionAssignment,
} from "../domain/model";
import { formatNumber } from "../i18n/locale";
import {
  compareNutrition,
  nutritionTarget,
  plannedAmount,
  productTotals,
  segmentPlanning,
} from "./nutritionTotals";
import { isValidServingCount, planningReducer } from "./planningReducer";
import { requestOptimization } from "./optimizer/optimizerClient";

export const AUTOMATIC_PLANNING_DEADLINE_MS = 10_000;

const text = {
  en: {
    title: "Nutrition planning",
    automatic: "Create automatic plan",
    cancelAutomatic: "Cancel planning",
    clear: "Clear plan",
    confirmReplace: "Replace all existing nutrition assignments?",
    confirmClear: "Remove all nutrition assignments?",
    addOption: "Add nutrition option",
    chooseOption: "Choose an available option",
    add: "Add",
    servings: "Servings",
    remove: "Remove",
    available: "Available",
    unavailable: "Unavailable",
    category: "Category",
    target: "Target",
    plan: "Plan",
    delta: "Delta",
    covered: "Covered",
    undercovered: "Undercovered",
    containsUnavailable: "Contains unavailable option",
    overall: "Overall planning totals",
    products: "Products for complete course",
    product: "Product",
    status: "Status",
    running: "Creating best plan…",
    timeout: "Planning exceeded its runtime limit. Existing plan retained.",
    failed: "Planning failed. Existing plan retained.",
    cancelled: "Planning cancelled. Existing plan retained.",
    stale: "Inputs changed during planning. Existing plan retained.",
    completed: "Automatic plan created.",
    noOptions: "No available nutrition options.",
    carbohydrates: "Carbohydrates",
    water: "Water",
    sodium: "Sodium",
  },
  de: {
    title: "Verpflegungsplanung",
    automatic: "Automatischen Plan erstellen",
    cancelAutomatic: "Planung abbrechen",
    clear: "Plan löschen",
    confirmReplace: "Alle vorhandenen Verpflegungszuordnungen ersetzen?",
    confirmClear: "Alle Verpflegungszuordnungen entfernen?",
    addOption: "Verpflegungsoption hinzufügen",
    chooseOption: "Verfügbare Option auswählen",
    add: "Hinzufügen",
    servings: "Portionen",
    remove: "Entfernen",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    category: "Kategorie",
    target: "Ziel",
    plan: "Plan",
    delta: "Delta",
    covered: "Gedeckt",
    undercovered: "Unterdeckt",
    containsUnavailable: "Enthält nicht verfügbare Option",
    overall: "Gesamte Planungswerte",
    products: "Produkte für die Gesamtstrecke",
    product: "Produkt",
    status: "Status",
    running: "Bester Plan wird erstellt…",
    timeout:
      "Die Planung hat das Laufzeitlimit überschritten. Der bestehende Plan bleibt erhalten.",
    failed:
      "Die Planung ist fehlgeschlagen. Der bestehende Plan bleibt erhalten.",
    cancelled:
      "Die Planung wurde abgebrochen. Der bestehende Plan bleibt erhalten.",
    stale:
      "Eingaben wurden während der Planung geändert. Der bestehende Plan bleibt erhalten.",
    completed: "Automatischer Plan erstellt.",
    noOptions: "Keine verfügbare Verpflegungsoption.",
    carbohydrates: "Kohlenhydrate",
    water: "Wasser",
    sodium: "Natrium",
  },
} as const;

interface Props {
  language: Language;
  calculated: CalculatedPlan;
  assignments: NutritionAssignment[];
  options: NutritionOption[];
  onChange: (assignments: NutritionAssignment[]) => void;
}

export function NutritionPlanningView({
  language,
  calculated,
  assignments,
  options,
  onChange,
}: Props) {
  const m = text[language];
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState<ReturnType<
    typeof requestOptimization
  > | null>(null);
  const revision = JSON.stringify({
    segments: calculated.segments.map((segment) => [
      segment.id,
      segment.nutrition,
    ]),
    options,
  });
  const revisionRef = useRef(revision);
  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);
  const segments = useMemo(
    () => segmentPlanning(calculated, assignments, options),
    [calculated, assignments, options],
  );
  const overall = compareNutrition(
    nutritionTarget(calculated.nutrition),
    plannedAmount(assignments, options),
  );
  const available = options.filter((option) => option.available);

  function setAssignment(
    segmentId: string,
    optionId: string,
    servings: number,
  ) {
    onChange(
      planningReducer(assignments, {
        type: "set",
        segmentId,
        optionId,
        servings,
      }),
    );
  }

  function generate() {
    if (assignments.length > 0 && !window.confirm(m.confirmReplace)) return;
    const startedRevision = revision;
    const next = requestOptimization({
      deadlineMs: AUTOMATIC_PLANNING_DEADLINE_MS,
      segments: calculated.segments.map((segment) => ({
        segmentId: segment.id,
        target: segment.nutrition,
      })),
      options: available.map((option) => ({
        id: option.id,
        carbohydratesG: option.carbohydratesG,
        waterDeciliters: option.waterDeciliters,
        sodiumMg: option.sodiumMg,
      })),
    });
    setRequest(next);
    setMessage(m.running);
    void next.promise.then((result) => {
      setRequest(null);
      if (revisionRef.current !== startedRevision) {
        setMessage(m.stale);
        return;
      }
      if (result.type === "success") {
        onChange(result.assignments);
        setMessage(m.completed);
      } else if (result.type === "timeout") setMessage(m.timeout);
      else if (result.type === "cancelled") setMessage(m.cancelled);
      else setMessage(m.failed);
    });
  }

  return (
    <section className="nutrition-planner" aria-busy={request !== null}>
      <div className="section-heading with-action">
        <h3>{m.title}</h3>
        <div className="item-actions">
          {request ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={request.cancel}
            >
              {m.cancelAutomatic}
            </button>
          ) : (
            <button
              type="button"
              className="button"
              disabled={available.length === 0}
              onClick={generate}
            >
              {m.automatic}
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={assignments.length === 0}
            onClick={() => {
              if (window.confirm(m.confirmClear)) onChange([]);
            }}
          >
            {m.clear}
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className={request ? "planning-progress" : undefined}>
          {request && <span className="planning-loader" aria-hidden="true" />}
          <span>{message}</span>
        </p>
      )}
      {available.length === 0 && <p>{m.noOptions}</p>}
      <div className="planning-segments">
        {calculated.segments.map((segment, index) => {
          const planning = segments[index]!;
          return (
            <SegmentEditor
              key={segment.id}
              language={language}
              route={`${segment.from.name} → ${segment.to.name}`}
              assignments={planning.assignments}
              comparison={planning.comparison}
              statuses={planning.statuses}
              options={options}
              available={available}
              onSet={(optionId, servings) =>
                setAssignment(segment.id, optionId, servings)
              }
              m={m}
            />
          );
        })}
      </div>
      <Comparison
        title={m.overall}
        comparison={overall}
        language={language}
        m={m}
      />
      <h4>{m.products}</h4>
      <div className="catalogue-table-wrap">
        <table className="catalogue-table">
          <thead>
            <tr>
              <th>{m.product}</th>
              <th>{m.servings}</th>
              <th>{m.status}</th>
            </tr>
          </thead>
          <tbody>
            {productTotals(assignments).map((total) => {
              const option = options.find((item) => item.id === total.optionId);
              if (!option) return null;
              return (
                <tr key={total.optionId}>
                  <th scope="row">
                    {option.brand} – {option.name}
                  </th>
                  <td>{total.servings}</td>
                  <td>{option.available ? m.available : m.unavailable}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SegmentEditor({
  language,
  route,
  assignments,
  comparison,
  statuses,
  options,
  available,
  onSet,
  m,
}: {
  language: Language;
  route: string;
  assignments: NutritionAssignment[];
  comparison: ReturnType<typeof compareNutrition>;
  statuses: ReturnType<typeof segmentPlanning>[number]["statuses"];
  options: NutritionOption[];
  available: NutritionOption[];
  onSet: (optionId: string, servings: number) => void;
  m: (typeof text)["en"] | (typeof text)["de"];
}) {
  const [selected, setSelected] = useState("");
  return (
    <article className="planning-segment">
      <h4>{route}</h4>
      <p className="planning-status">
        {statuses
          .map((status) =>
            status === "covered"
              ? m.covered
              : status === "undercovered"
                ? m.undercovered
                : m.containsUnavailable,
          )
          .join(" · ")}
      </p>
      <div className="inline-form">
        <label>
          <span>{m.addOption}</span>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">{m.chooseOption}</option>
            {available
              .filter(
                (option) =>
                  !assignments.some(
                    (assignment) => assignment.optionId === option.id,
                  ),
              )
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.brand} – {option.name}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          className="button button-secondary"
          disabled={!selected}
          onClick={() => {
            onSet(selected, 1);
            setSelected("");
          }}
        >
          {m.add}
        </button>
      </div>
      <div className="planning-assignments">
        {assignments.map((assignment) => {
          const option = options.find(
            (item) => item.id === assignment.optionId,
          );
          if (!option) return null;
          return (
            <div className="planning-assignment" key={option.id}>
              <span>
                {option.brand} – {option.name}
                {!option.available && ` · ${m.unavailable}`}
              </span>
              <label>
                <span>{m.servings}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={assignment.servings}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (isValidServingCount(value)) onSet(option.id, value);
                  }}
                />
              </label>
              <button
                type="button"
                className="text-button danger"
                onClick={() => onSet(option.id, 0)}
              >
                {m.remove}
              </button>
            </div>
          );
        })}
      </div>
      <Comparison comparison={comparison} language={language} m={m} />
    </article>
  );
}

function Comparison({
  title,
  comparison,
  language,
  m,
}: {
  title?: string;
  comparison: ReturnType<typeof compareNutrition>;
  language: Language;
  m: (typeof text)["en"] | (typeof text)["de"];
}) {
  const rows = [
    ["carbohydratesG", m.carbohydrates, "g", 1],
    ["waterDeciliters", m.water, "L", 0.1],
    ["sodiumMg", m.sodium, "mg", 1],
  ] as const;
  return (
    <div className="planning-comparison">
      {title && <h4>{title}</h4>}
      <div className="catalogue-table-wrap">
        <table className="catalogue-table nutrition-comparison-table">
          <thead>
            <tr>
              <th>{m.category}</th>
              <th>{m.target}</th>
              <th>{m.plan}</th>
              <th>{m.delta}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, label, unit, factor]) => {
              const target = comparison.target[key];
              const planned = comparison.planned[key];
              const delta = planned - target;
              return (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>
                    {formatNumber(target * factor, language)} {unit}
                  </td>
                  <td>
                    {formatNumber(planned * factor, language)} {unit}
                  </td>
                  <td className={deltaClassName(delta, target)}>
                    {formatSignedNumber(delta * factor, language)} {unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function deltaClassName(delta: number, target: number): string | undefined {
  const relativeDelta =
    target === 0
      ? delta === 0
        ? 0
        : Number.POSITIVE_INFINITY
      : Math.abs(delta / target);
  if (relativeDelta > 0.2) return "nutrition-delta-critical";
  if (relativeDelta > 0.05) return "nutrition-delta-warning";
  return undefined;
}

function formatSignedNumber(value: number, language: Language): string {
  const formatted = formatNumber(Math.abs(value), language);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}
