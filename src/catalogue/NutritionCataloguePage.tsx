import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import csv from "../data/nutrition-options.csv?raw";
import { CATALOGUE_VERSION } from "../data/catalogueVersion";
import type { Language } from "../domain/model";
import {
  defaultCatalogueView,
  type CatalogueState,
  type CatalogueViewState,
  type NutritionOption,
  type SortField,
} from "./model";
import { parseCatalogueCsv } from "./parseCatalogueCsv";
import { selectCatalogue } from "./selectors";
import {
  parseWater,
  parseWhole,
  saltToSodium,
  validateOption,
} from "./validation";
import {
  loadCatalogue,
  saveCatalogue,
} from "../persistence/catalogueRepository";

const text = {
  en: {
    title: "Nutrition options",
    add: "Add option",
    reload: "Reload defaults",
    search: "Search by name",
    source: "Source",
    availability: "Availability",
    all: "All",
    standard: "Standard",
    custom: "Custom",
    available: "Available",
    unavailable: "Unavailable",
    name: "Name",
    carbs: "Carbohydrates (g)",
    sodium: "Sodium (mg)",
    salt: "Salt (mg)",
    water: "Water (L)",
    actions: "Actions",
    edit: "Edit",
    remove: "Delete",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    noResults: "No matching options.",
    createTitle: "Add nutrition option",
    editTitle: "Edit nutrition option",
    inputMethod: "Entry method",
    preview: "Calculated sodium",
    save: "Save",
    cancel: "Cancel",
    confirmDelete: "Delete this custom option permanently?",
    confirmReload:
      "Reloading deletes all custom options and availability changes. Continue?",
    successAdd: "Nutrition option added.",
    successEdit: "Nutrition option updated.",
    successDelete: "Nutrition option deleted.",
    successReload: "Catalogue defaults reloaded.",
    versionReload:
      "The bundled catalogue changed. User catalogue changes were replaced.",
    storage:
      "Changes cannot be saved in this browser, but the catalogue remains usable.",
    invalidRows: "Invalid CSV rows skipped:",
    required: "Enter a name.",
    duplicate: "This name already exists.",
    whole: "Enter a non-negative whole number.",
    waterError: "Enter a non-negative value in increments of 0.1 L.",
  },
  de: {
    title: "Verpflegungsoptionen",
    add: "Option hinzufügen",
    reload: "Standarddaten neu laden",
    search: "Nach Name suchen",
    source: "Quelle",
    availability: "Verfügbarkeit",
    all: "Alle",
    standard: "Standard",
    custom: "Benutzerdefiniert",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    name: "Name",
    carbs: "Kohlenhydrate (g)",
    sodium: "Natrium (mg)",
    salt: "Salz (mg)",
    water: "Wasser (L)",
    actions: "Aktionen",
    edit: "Bearbeiten",
    remove: "Löschen",
    previous: "Zurück",
    next: "Weiter",
    page: "Seite",
    of: "von",
    noResults: "Keine passenden Optionen.",
    createTitle: "Verpflegungsoption hinzufügen",
    editTitle: "Verpflegungsoption bearbeiten",
    inputMethod: "Eingabemethode",
    preview: "Berechnetes Natrium",
    save: "Speichern",
    cancel: "Abbrechen",
    confirmDelete: "Diese benutzerdefinierte Option endgültig löschen?",
    confirmReload:
      "Beim Neuladen werden alle benutzerdefinierten Optionen und Verfügbarkeitsänderungen gelöscht. Fortfahren?",
    successAdd: "Verpflegungsoption hinzugefügt.",
    successEdit: "Verpflegungsoption aktualisiert.",
    successDelete: "Verpflegungsoption gelöscht.",
    successReload: "Standardkatalog neu geladen.",
    versionReload:
      "Der mitgelieferte Katalog wurde geändert. Benutzeränderungen wurden ersetzt.",
    storage:
      "Änderungen können in diesem Browser nicht gespeichert werden; der Katalog bleibt nutzbar.",
    invalidRows: "Ungültige CSV-Zeilen übersprungen:",
    required: "Name eingeben.",
    duplicate: "Dieser Name existiert bereits.",
    whole: "Eine nicht negative ganze Zahl eingeben.",
    waterError: "Einen nicht negativen Wert in Schritten von 0,1 L eingeben.",
  },
} as const;

const importedCatalogue = parseCatalogueCsv(csv);

function defaultCatalogue(): CatalogueState {
  return {
    catalogueVersion: CATALOGUE_VERSION,
    options: importedCatalogue.options,
  };
}

interface Draft {
  editingId?: string;
  name: string;
  carbohydrates: string;
  method: "sodium" | "salt";
  mineral: string;
  water: string;
}

export function NutritionCataloguePage({ language }: { language: Language }) {
  const m = text[language];
  const languageRef = useRef(language);
  const [state, setState] = useState<CatalogueState>(defaultCatalogue);
  const [view, setView] = useState<CatalogueViewState>(defaultCatalogueView);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const result = useMemo(
    () => selectCatalogue(state.options, view),
    [state, view],
  );

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    let active = true;
    loadCatalogue()
      .then((stored) => {
        if (!active) return;
        setView(stored.view);
        if (stored.state?.catalogueVersion === CATALOGUE_VERSION)
          setState(stored.state);
        else {
          setState(defaultCatalogue());
          if (stored.state) setNotice(text[languageRef.current].versionReload);
        }
      })
      .catch(() => setNotice(text[languageRef.current].storage))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(
      () =>
        void saveCatalogue(state, view).catch(() =>
          setNotice(text[languageRef.current].storage),
        ),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [state, view, ready]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      void saveCatalogue(state, view).catch(() =>
        setNotice(text[languageRef.current].storage),
      );
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [state, view, ready]);

  function updateView(patch: Partial<CatalogueViewState>, reset = true) {
    setView((current) => ({
      ...current,
      ...patch,
      ...(reset ? { page: 1 } : {}),
    }));
  }
  function sort(sortBy: SortField) {
    updateView({
      sortBy,
      sortDirection:
        view.sortBy === sortBy && view.sortDirection === "ascending"
          ? "descending"
          : "ascending",
    });
  }
  function openAdd() {
    setDraft({
      name: "",
      carbohydrates: "0",
      method: "sodium",
      mineral: "0",
      water: "0.0",
    });
  }
  function openEdit(option: NutritionOption) {
    setDraft({
      editingId: option.id,
      name: option.name,
      carbohydrates: String(option.carbohydratesG),
      method: "sodium",
      mineral: String(option.sodiumMg),
      water: (option.waterDeciliters / 10).toFixed(1),
    });
  }
  function reload() {
    if (!window.confirm(m.confirmReload)) return;
    setState(defaultCatalogue());
    setNotice(m.successReload);
  }
  function remove(option: NutritionOption) {
    if (!window.confirm(m.confirmDelete)) return;
    setState((current) => ({
      ...current,
      options: current.options.filter((item) => item.id !== option.id),
    }));
    setNotice(m.successDelete);
  }
  function toggle(option: NutritionOption) {
    setState((current) => ({
      ...current,
      options: current.options.map((item) =>
        item.id === option.id ? { ...item, available: !item.available } : item,
      ),
    }));
  }

  const warning = importedCatalogue.issues.length
    ? `${m.invalidRows} ${importedCatalogue.issues.map((issue) => issue.row).join(", ")}`
    : "";

  return (
    <>
      {(notice || warning) && (
        <div className="notice" role="status">
          {notice || warning}
        </div>
      )}
      <section className="panel catalogue">
        <div className="section-heading with-action">
          <h2>{m.title}</h2>
          <div className="catalogue-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={reload}
            >
              {m.reload}
            </button>
            <button className="button" type="button" onClick={openAdd}>
              + {m.add}
            </button>
          </div>
        </div>
        <div className="catalogue-controls">
          <label className="field">
            <span>{m.search}</span>
            <input
              type="search"
              value={view.search}
              onChange={(e) => updateView({ search: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{m.source}</span>
            <select
              value={view.source}
              onChange={(e) =>
                updateView({
                  source: e.target.value as CatalogueViewState["source"],
                })
              }
            >
              <option value="all">{m.all}</option>
              <option value="standard">{m.standard}</option>
              <option value="custom">{m.custom}</option>
            </select>
          </label>
          <label className="field">
            <span>{m.availability}</span>
            <select
              value={view.availability}
              onChange={(e) =>
                updateView({
                  availability: e.target
                    .value as CatalogueViewState["availability"],
                })
              }
            >
              <option value="all">{m.all}</option>
              <option value="available">{m.available}</option>
              <option value="unavailable">{m.unavailable}</option>
            </select>
          </label>
        </div>
        {result.options.length === 0 ? (
          <p className="empty-state">{m.noResults}</p>
        ) : (
          <div className="catalogue-table-wrap">
            <table className="catalogue-table">
              <thead>
                <tr>
                  {(
                    [
                      ["name", m.name],
                      ["carbohydratesG", m.carbs],
                      ["sodiumMg", m.sodium],
                      ["waterDeciliters", m.water],
                      ["available", m.availability],
                      ["source", m.source],
                    ] as Array<[SortField, string]>
                  ).map(([field, label]) => (
                    <th key={field} scope="col">
                      <button type="button" onClick={() => sort(field)}>
                        {label}
                        {view.sortBy === field
                          ? view.sortDirection === "ascending"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>
                    </th>
                  ))}
                  <th scope="col">{m.actions}</th>
                </tr>
              </thead>
              <tbody>
                {result.options.map((option) => (
                  <tr key={option.id}>
                    <th scope="row">{option.name}</th>
                    <td>{option.carbohydratesG}</td>
                    <td>{option.sodiumMg}</td>
                    <td>{(option.waterDeciliters / 10).toFixed(1)}</td>
                    <td>
                      <label className="availability-toggle">
                        <input
                          type="checkbox"
                          checked={option.available}
                          onChange={() => toggle(option)}
                        />
                        <span>
                          {option.available ? m.available : m.unavailable}
                        </span>
                      </label>
                    </td>
                    <td>
                      <span className="badge">
                        {option.source === "standard" ? m.standard : m.custom}
                      </span>
                    </td>
                    <td>
                      {option.source === "custom" && (
                        <div className="item-actions">
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => openEdit(option)}
                          >
                            {m.edit}
                          </button>
                          <button
                            className="text-button danger"
                            type="button"
                            onClick={() => remove(option)}
                          >
                            {m.remove}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav className="pagination" aria-label={m.page}>
          <button
            className="button button-secondary"
            type="button"
            disabled={result.page === 1}
            onClick={() => updateView({ page: result.page - 1 }, false)}
          >
            {m.previous}
          </button>
          <span>
            {m.page} {result.page} {m.of} {result.pageCount}
          </span>
          <button
            className="button button-secondary"
            type="button"
            disabled={result.page === result.pageCount}
            onClick={() => updateView({ page: result.page + 1 }, false)}
          >
            {m.next}
          </button>
        </nav>
      </section>
      {draft && (
        <OptionDialog
          m={m}
          draft={draft}
          options={state.options}
          onCancel={() => setDraft(null)}
          onSave={(option) => {
            const nextState: CatalogueState = {
              ...state,
              options: draft.editingId
                ? state.options.map((item) =>
                    item.id === draft.editingId ? option : item,
                  )
                : [...state.options, option],
            };
            setState(nextState);
            setDraft(null);
            void saveCatalogue(nextState, view)
              .then(() =>
                setNotice(draft.editingId ? m.successEdit : m.successAdd),
              )
              .catch(() => setNotice(m.storage));
          }}
        />
      )}
    </>
  );
}

function OptionDialog({
  m,
  draft,
  options,
  onCancel,
  onSave,
}: {
  m: (typeof text)["en"] | (typeof text)["de"];
  draft: Draft;
  options: NutritionOption[];
  onCancel: () => void;
  onSave: (option: NutritionOption) => void;
}) {
  const [form, setForm] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const sodium =
    form.method === "sodium"
      ? parseWhole(form.mineral)
      : parseWhole(form.mineral) === null
        ? null
        : saltToSodium(parseWhole(form.mineral)!);
  function submit(event: FormEvent) {
    event.preventDefault();
    const carbohydratesG = parseWhole(form.carbohydrates);
    const waterDeciliters = parseWater(form.water);
    const input = {
      name: form.name.trim(),
      carbohydratesG: carbohydratesG ?? -1,
      sodiumMg: sodium ?? -1,
      waterDeciliters: waterDeciliters ?? -1,
    };
    const found = validateOption(input, options, form.editingId);
    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }
    const existing = options.find((option) => option.id === form.editingId);
    onSave({
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      available: existing?.available ?? true,
      source: "custom",
    });
  }
  const errorText = (code?: string) =>
    code === "required"
      ? m.required
      : code === "duplicate"
        ? m.duplicate
        : code === "water"
          ? m.waterError
          : code
            ? m.whole
            : "";
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="option-title"
      >
        <h2 id="option-title">
          {form.editingId ? m.editTitle : m.createTitle}
        </h2>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span>{m.name}</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && (
                <small className="field-error">{errorText(errors.name)}</small>
              )}
            </label>
            <label className="field">
              <span>{m.carbs}</span>
              <input
                inputMode="numeric"
                value={form.carbohydrates}
                onChange={(e) =>
                  setForm({ ...form, carbohydrates: e.target.value })
                }
              />
              {errors.carbohydratesG && (
                <small className="field-error">
                  {errorText(errors.carbohydratesG)}
                </small>
              )}
            </label>
            <label className="field">
              <span>{m.inputMethod}</span>
              <select
                aria-label={m.inputMethod}
                value={form.method}
                onChange={(e) =>
                  setForm({
                    ...form,
                    method: e.target.value as Draft["method"],
                  })
                }
              >
                <option value="sodium">{m.sodium}</option>
                <option value="salt">{m.salt}</option>
              </select>
            </label>
            <label className="field">
              <span>{form.method === "sodium" ? m.sodium : m.salt}</span>
              <input
                aria-label={form.method === "sodium" ? m.sodium : m.salt}
                inputMode="numeric"
                value={form.mineral}
                onChange={(e) => setForm({ ...form, mineral: e.target.value })}
              />
              {errors.sodiumMg && (
                <small className="field-error">
                  {errorText(errors.sodiumMg)}
                </small>
              )}
            </label>
            {form.method === "salt" && (
              <p role="status">
                {m.preview}: {sodium ?? "—"} mg
              </p>
            )}
            <label className="field">
              <span>{m.water}</span>
              <input
                inputMode="decimal"
                value={form.water}
                onChange={(e) => setForm({ ...form, water: e.target.value })}
              />
              {errors.waterDeciliters && (
                <small className="field-error">
                  {errorText(errors.waterDeciliters)}
                </small>
              )}
            </label>
          </div>
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
