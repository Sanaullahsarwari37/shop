import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n";
import { cn } from "../lib/utils";
import {
  useSettings,
  CURRENCIES,
  THEME_PRESETS,
  ENGLISH_FONTS,
  DARI_FONTS,
  PASHTO_FONTS,
  type ThemePresetId,
  type CurrencyCode,
} from "../contexts/SettingsContext";
import { useState, useEffect } from "react";
import { Palette, Type, Moon, Sun, Coins, Languages } from "lucide-react";

/** Standard font sizes — same for English, Dari, and Pashto */
/** MS Word–style size list → scale vs 16px root */
const FONT_SIZES = [
  { px: 11, scale: 11 / 16 },
  { px: 12, scale: 12 / 16 },
  { px: 14, scale: 14 / 16 },
  { px: 16, scale: 16 / 16 },
  { px: 18, scale: 18 / 16 },
  { px: 20, scale: 20 / 16 },
  { px: 22, scale: 22 / 16 },
  { px: 24, scale: 24 / 16 },
  { px: 28, scale: 28 / 16 },
  { px: 32, scale: 32 / 16 },
] as const;

function nearestSize(scale: number) {
  let best = FONT_SIZES[3]; // 16
  let dist = Math.abs(scale - best.scale);
  for (const s of FONT_SIZES) {
    const d = Math.abs(scale - s.scale);
    if (d < dist) {
      best = s;
      dist = d;
    }
  }
  return best;
}

const selectCls =
  "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40";

export default function Settings() {
  const { t, locale, setLocale, locales } = useLanguage();
  const {
    settings,
    setCurrency,
    setAllowDecimals,
    setThemePreset,
    setDarkMode,
    setFontEnglish,
    setFontDari,
    setFontPashto,
    setFontScale,
    setFontWeightRtl,
    resetThemeToDefault,
  } = useSettings();

  const [fontDraft, setFontDraft] = useState({
    fontEnglish: settings.fontEnglish,
    fontDari: settings.fontDari,
    fontPashto: settings.fontPashto,
    fontScale: settings.fontScale,
    fontWeightRtl: settings.fontWeightRtl,
  });

  useEffect(() => {
    setFontDraft({
      fontEnglish: settings.fontEnglish,
      fontDari: settings.fontDari,
      fontPashto: settings.fontPashto,
      fontScale: settings.fontScale,
      fontWeightRtl: settings.fontWeightRtl,
    });
  }, [
    settings.fontEnglish,
    settings.fontDari,
    settings.fontPashto,
    settings.fontScale,
    settings.fontWeightRtl,
  ]);

  const saveFonts = () => {
    setFontEnglish(fontDraft.fontEnglish);
    setFontDari(fontDraft.fontDari);
    setFontPashto(fontDraft.fontPashto);
    setFontScale(fontDraft.fontScale);
    setFontWeightRtl(fontDraft.fontWeightRtl);
  };

  const selectPreset = (id: ThemePresetId) => {
    setThemePreset(id);
  };

  const applyDefault = () => {
    resetThemeToDefault();
  };

  const activeSize = nearestSize(fontDraft.fontScale);

  const enStack =
    ENGLISH_FONTS.find((f) => f.id === fontDraft.fontEnglish)?.stack ?? ENGLISH_FONTS[0].stack;
  const faStack =
    DARI_FONTS.find((f) => f.id === fontDraft.fontDari)?.stack ?? DARI_FONTS[0].stack;
  const psStack =
    PASHTO_FONTS.find((f) => f.id === fontDraft.fontPashto)?.stack ?? PASHTO_FONTS[0].stack;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("settings.subtitle")}</p>
      </div>

      {/* Language */}
      <section className="settings-section space-y-4">
        <div className="flex items-center gap-2">
          <Languages size={16} className="text-slate-400" />
          <h2>{t("settings.language")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {locales.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLocale(l.code as Locale)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                locale === l.code
                  ? "btn-primary border-transparent shadow-sm"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      {/* Fonts — MS Word style toolbar */}
      <section className="settings-section space-y-4">
        <div className="flex items-center gap-2">
          <Type size={16} className="text-slate-400" />
          <h2>{t("settings.fonts") || "Fonts"}</h2>
        </div>
        <p className="text-xs text-slate-500 -mt-1">
          {t("settings.fontsHint") ||
            "Like Microsoft Word: choose font and size. Applies to the whole website."}
        </p>

        {/* Toolbar row */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <label className="block space-y-1.5 min-w-0">
              <span className="text-xs font-medium text-slate-500">English</span>
              <select
                className={selectCls}
                value={fontDraft.fontEnglish}
                onChange={(e) => {
                  const id = e.target.value;
                  setFontDraft((d) => ({ ...d, fontEnglish: id }));
                  setFontEnglish(id);
                }}
              >
                {ENGLISH_FONTS.map((f) => (
                  <option key={f.id} value={f.id} style={{ fontFamily: f.stack }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 min-w-0">
              <span className="text-xs font-medium text-slate-500">دری (Dari)</span>
              <select
                className={selectCls}
                value={fontDraft.fontDari}
                onChange={(e) => {
                  const id = e.target.value;
                  setFontDraft((d) => ({ ...d, fontDari: id }));
                  setFontDari(id);
                }}
              >
                {DARI_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 min-w-0">
              <span className="text-xs font-medium text-slate-500">پښتو (Pashto)</span>
              <select
                className={selectCls}
                value={fontDraft.fontPashto}
                onChange={(e) => {
                  const id = e.target.value;
                  setFontDraft((d) => ({ ...d, fontPashto: id }));
                  setFontPashto(id);
                }}
              >
                {PASHTO_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-2 items-end">
              <label className="block space-y-1.5 flex-1 min-w-0">
                <span className="text-xs font-medium text-slate-500">
                  {t("settings.fontSize") || "Size"}
                </span>
                <select
                  className={selectCls}
                  value={activeSize.px}
                  onChange={(e) => {
                    const px = Number(e.target.value);
                    const row = FONT_SIZES.find((s) => s.px === px) ?? FONT_SIZES[3];
                    setFontDraft((d) => ({ ...d, fontScale: row.scale }));
                    setFontScale(row.scale);
                  }}
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s.px} value={s.px}>
                      {s.px}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1 pb-0.5">
                {([
                  { w: "500" as const, label: "M", title: "Medium" },
                  { w: "600" as const, label: "SB", title: "SemiBold" },
                  { w: "700" as const, label: "B", title: "Bold" },
                ]).map(({ w, label, title }) => (
                  <button
                    key={w}
                    type="button"
                    title={title}
                    onClick={() => {
                      setFontDraft((d) => ({ ...d, fontWeightRtl: w }));
                      setFontWeightRtl(w);
                    }}
                    className={cn(
                      "h-10 min-w-10 px-1.5 rounded-lg border text-xs font-bold",
                      fontDraft.fontWeightRtl === w
                        ? "btn-primary border-transparent"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview strip (fixed sample size like Word) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
              Preview
            </p>
            <p style={{ fontFamily: enStack, fontSize: 14, lineHeight: 1.5 }}>
              English — Shop Manager looks clear and professional
            </p>
            <p dir="rtl" style={{ fontFamily: faStack, fontSize: 14, lineHeight: 1.7, fontWeight: Number(fontDraft.fontWeightRtl) }}>
              دری — مدیریت دوکان خوانا و واضح
            </p>
            <p dir="rtl" style={{ fontFamily: psStack, fontSize: 14, lineHeight: 1.7, fontWeight: Number(fontDraft.fontWeightRtl) }}>
              پښتو — دوکان مدیریت روښانه او لوستل کېدونکی
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Changes apply to the whole website. Preview text stays 14px so you can compare fonts easily.
        </p>
      </section>

      {/* Currency */}
      <section className="settings-section space-y-4">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-slate-400" />
          <h2>{t("settings.currency")}</h2>
        </div>
        <p className="text-xs text-slate-500 -mt-2">{t("settings.currencyHint")}</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setCurrency(c.code as CurrencyCode)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-semibold border",
                settings.currency === c.code
                  ? "btn-primary border-transparent"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Decimals */}
      <section className="settings-section space-y-4">
        <h2>{t("settings.decimalPlaces")}</h2>
        <p className="text-xs text-slate-500 -mt-2">{t("settings.decimalHint")}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={settings.allowDecimals}
            onClick={() => setAllowDecimals(!settings.allowDecimals)}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              settings.allowDecimals ? "bg-primary-600" : "bg-slate-300 dark:bg-slate-600"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform transition",
                settings.allowDecimals ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
          <span className="text-sm font-semibold">
            {settings.allowDecimals ? t("settings.decimalsOn") : t("settings.decimalsOff")}
          </span>
        </div>
      </section>

      {/* Theme: light/dark + presets only */}
      <section className="settings-section space-y-5">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-slate-400" />
          <h2>{t("settings.theme")}</h2>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDarkMode(false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all",
              !settings.darkMode
                ? "btn-primary border-transparent shadow-sm"
                : "border-slate-200 dark:border-slate-700"
            )}
          >
            <Sun size={16} /> {t("settings.light")}
          </button>
          <button
            type="button"
            onClick={() => setDarkMode(true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all",
              settings.darkMode
                ? "btn-primary border-transparent shadow-sm"
                : "border-slate-200 dark:border-slate-700"
            )}
          >
            <Moon size={16} /> {t("settings.dark")}
          </button>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("settings.themePresets") || "Color themes"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {t("settings.themePresetsHint") || "Choose a palette. Default restores the original theme."}
              </p>
            </div>
            <button
              type="button"
              onClick={applyDefault}
              className="px-5 py-2.5 rounded-xl btn-primary text-sm font-semibold shadow-sm shrink-0"
            >
              {t("settings.defaultTheme") || "Default"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((id) => {
              const preset = THEME_PRESETS[id];
              const active =
                settings.themePreset === id && !settings.customColors;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPreset(id)}
                  className={cn(
                    "group relative rounded-2xl border overflow-hidden text-start transition-all hover:shadow-lg hover:-translate-y-0.5",
                    active
                      ? "ring-2 ring-primary-600 border-primary-600 shadow-md"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div
                    className="h-14 w-full"
                    style={{
                      background: `linear-gradient(135deg, ${preset.colors.sidebar} 0%, ${preset.colors.primary} 50%, ${preset.colors.accent} 100%)`,
                    }}
                  />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{preset.label}</span>
                    <div className="flex gap-1">
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: preset.colors.primary }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: preset.colors.sidebar }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
