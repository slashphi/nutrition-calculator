import { de } from "./de";
import { en } from "./en";
import type { Language } from "../domain/model";
import type { Messages } from "./en";

export const translations = { en, de };

export function detectLanguage(browserLanguage = navigator.language): Language {
  return browserLanguage.toLowerCase().startsWith("de") ? "de" : "en";
}

export function messages(language: Language): Messages {
  return translations[language];
}

export function formatNumber(
  value: number,
  language: Language,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(
    language === "de" ? "de-DE" : "en-US",
    options,
  ).format(value);
}
