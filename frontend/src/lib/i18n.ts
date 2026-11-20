import { dictionaries } from "./i18n-dictionaries";

export type LanguageCode = "en" | "fr" | "rw";

export const languages: Array<{
  code: LanguageCode;
  label: string;
  short: string;
}> = [
  { code: "en", label: "English", short: "EN" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "rw", label: "Kinyarwanda", short: "RW" },
];

const locales: Record<LanguageCode, string> = {
  en: "en-US",
  fr: "fr-FR",
  rw: "rw-RW",
};

export function parseLanguage(value: string | null | undefined): LanguageCode {
  return value === "fr" || value === "rw" ? value : "en";
}

export function localeFor(language: LanguageCode): string {
  return locales[language];
}

export function translate(language: LanguageCode, text: string): string {
  if (language === "en") return text;
  return dictionaries[language]?.[text] ?? text;
}
