import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Locale,
  type Translations,
  getTranslations,
  getDir,
  locales,
  t as translate,
} from "./index";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
  t: (path: string, fallback?: string) => string;
  translations: Translations;
  locales: typeof locales;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "shop_locale";

function detectInitial(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && ["en", "ps", "fa"].includes(saved)) return saved;
  } catch {}
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitial);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const dir = getDir(locale);

  useEffect(() => {
    document.documentElement.lang = locale === "fa" ? "fa" : locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const t = useCallback(
    (path: string, fallback?: string) => translate(locale, path, fallback),
    [locale]
  );

  const value: LanguageContextValue = {
    locale,
    setLocale,
    dir,
    t,
    translations: getTranslations(locale),
    locales,
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
