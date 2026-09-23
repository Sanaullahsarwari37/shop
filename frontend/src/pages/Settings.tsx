import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n";
import { cn } from "../lib/utils";

export default function Settings() {
  const { t, locale, setLocale, locales } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 max-w-lg">
        <div>
          <label className="text-sm font-medium">{t("settings.language")}</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {locales.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code as Locale)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  locale === l.code
                    ? "bg-primary-600 text-white border-primary-600"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">{t("settings.currency")}</label>
          <input
            defaultValue="AFN (؋)"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-transparent"
            disabled
          />
        </div>
      </div>
    </div>
  );
}
