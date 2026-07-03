import { useEffect, useRef, useState } from "react";
import csv from "../data/nutrition-options.csv?raw";
import { CATALOGUE_VERSION } from "../data/catalogueVersion";
import type { Language } from "../domain/model";
import {
  loadCatalogue,
  saveCatalogue,
} from "../persistence/catalogueRepository";
import {
  defaultCatalogueView,
  type CatalogueState,
  type CatalogueViewState,
} from "./model";
import { parseCatalogueCsv } from "./parseCatalogueCsv";

const imported = parseCatalogueCsv(csv);

export function bundledCatalogue(): CatalogueState {
  return {
    catalogueVersion: CATALOGUE_VERSION,
    options: imported.options,
  };
}

export function useCatalogueState(language: Language) {
  const languageRef = useRef(language);
  const [state, setState] = useState<CatalogueState>(bundledCatalogue);
  const [view, setView] = useState<CatalogueViewState>(defaultCatalogueView);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<"versionReload" | "storage" | null>(
    null,
  );

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    let active = true;
    void loadCatalogue()
      .then((stored) => {
        if (!active) return;
        setView(stored.view);
        if (stored.state?.catalogueVersion === CATALOGUE_VERSION)
          setState(stored.state);
        else {
          setState(bundledCatalogue());
          if (stored.state) setNotice("versionReload");
        }
      })
      .catch(() => setNotice("storage"))
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
      void saveCatalogue(state, view).catch(() => setNotice("storage"));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state, view, ready]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      void saveCatalogue(state, view).catch(() => setNotice("storage"));
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [state, view, ready]);

  return {
    state,
    setState,
    view,
    setView,
    ready,
    notice,
    clearNotice: () => setNotice(null),
  };
}
