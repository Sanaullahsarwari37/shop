import en from "./en";
import ps from "./ps";
import fa from "./fa";

export type Locale = "en" | "ps" | "fa";
export type Translations = typeof en;

const resources: Record<Locale, any> = { en, ps, fa };

export const locales: { code: Locale; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "ps", label: "پښتو", dir: "rtl" },
  { code: "fa", label: "دری", dir: "rtl" },
];

export function getDir(locale: Locale): "ltr" | "rtl" {
  return locale === "en" ? "ltr" : "rtl";
}

export function t(
  locale: Locale,
  path: string,
  fallback?: string
): string {
  const parts = path.split(".");
  // Prefer current locale, fall back to English for missing keys
  for (const loc of [locale, "en" as Locale]) {
    let cur: any = resources[loc];
    let ok = true;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") {
        ok = false;
        break;
      }
      cur = cur[p];
    }
    if (ok && typeof cur === "string") return cur;
  }
  return fallback ?? path;
}

export function getTranslations(locale: Locale): Translations {
  return resources[locale] ?? resources.en;
}

export { resources };
