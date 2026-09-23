import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrencyCode = "AFN" | "USD" | "EUR" | "IRR" | "PKR";

export const CURRENCIES: {
  code: CurrencyCode;
  symbol: string;
  label: string;
}[] = [
  { code: "AFN", symbol: "؋", label: "AFN (؋)" },
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "IRR", symbol: "﷼", label: "IRR (﷼)" },
  { code: "PKR", symbol: "₨", label: "PKR (₨)" },
];

export type ThemePresetId =
  | "default"
  | "blue"
  | "green"
  | "purple"
  | "amber"
  | "rose"
  | "slate"
  | "teal";

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  sidebar: string;
  sidebarForeground: string;
  header: string;
  button: string;
  buttonText: string;
};

/** Separate dark-mode surface + brand colors (editable in Settings) */
export type DarkThemeColors = {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  border: string;
  sidebar: string;
  sidebarForeground: string;
  header: string;
  button: string;
  buttonText: string;
};

/** Premium dark (2026): true grey base, elevated cards, sidebar = background */
export const DEFAULT_DARK: DarkThemeColors = {
  primary: "#38bdf8",
  accent: "#7dd3fc",
  background: "#0c0c0e",
  foreground: "#ececef",
  card: "#16161a",
  muted: "#222228",
  border: "#2e2e36",
  sidebar: "#0c0c0e",
  sidebarForeground: "#ececef",
  header: "#0c0c0e",
  button: "#0ea5e9",
  buttonText: "#ffffff",
};

export const THEME_PRESETS: Record<
  ThemePresetId,
  { label: string; colors: ThemeColors }
> = {
  default: {
    label: "Premium",
    colors: {
      primary: "#0ea5e9",
      secondary: "#64748b",
      accent: "#38bdf8",
      background: "#f4f6f9",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#eef2f7",
      mutedForeground: "#64748b",
      border: "#e2e8f0",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#0ea5e9",
      buttonText: "#ffffff",
    },
  },
  blue: {
    label: "Indigo",
    colors: {
      primary: "#6366f1",
      secondary: "#64748b",
      accent: "#818cf8",
      background: "#f5f5ff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#eef2ff",
      mutedForeground: "#64748b",
      border: "#e0e7ff",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#6366f1",
      buttonText: "#ffffff",
    },
  },
  green: {
    label: "Emerald",
    colors: {
      primary: "#10b981",
      secondary: "#64748b",
      accent: "#34d399",
      background: "#f3faf7",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#ecfdf5",
      mutedForeground: "#64748b",
      border: "#d1fae5",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#059669",
      buttonText: "#ffffff",
    },
  },
  purple: {
    label: "Violet",
    colors: {
      primary: "#8b5cf6",
      secondary: "#64748b",
      accent: "#a78bfa",
      background: "#faf5ff",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#f5f3ff",
      mutedForeground: "#64748b",
      border: "#ede9fe",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#7c3aed",
      buttonText: "#ffffff",
    },
  },
  amber: {
    label: "Amber",
    colors: {
      primary: "#f59e0b",
      secondary: "#64748b",
      accent: "#fbbf24",
      background: "#fffbeb",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#fef3c7",
      mutedForeground: "#64748b",
      border: "#fde68a",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#d97706",
      buttonText: "#ffffff",
    },
  },
  rose: {
    label: "Rose",
    colors: {
      primary: "#f43f5e",
      secondary: "#64748b",
      accent: "#fb7185",
      background: "#fff1f2",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#ffe4e6",
      mutedForeground: "#64748b",
      border: "#fecdd3",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#e11d48",
      buttonText: "#ffffff",
    },
  },
  slate: {
    label: "Slate",
    colors: {
      primary: "#475569",
      secondary: "#64748b",
      accent: "#64748b",
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#f1f5f9",
      mutedForeground: "#64748b",
      border: "#e2e8f0",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#334155",
      buttonText: "#ffffff",
    },
  },
  teal: {
    label: "Teal",
    colors: {
      primary: "#14b8a6",
      secondary: "#64748b",
      accent: "#2dd4bf",
      background: "#f0fdfa",
      foreground: "#0f172a",
      card: "#ffffff",
      cardForeground: "#0f172a",
      muted: "#ccfbf1",
      mutedForeground: "#64748b",
      border: "#99f6e4",
      sidebar: "#ffffff",
      sidebarForeground: "#0f172a",
      header: "#ffffff",
      button: "#0d9488",
      buttonText: "#ffffff",
    },
  },
};


/** Professional English UI fonts (local system stacks — no Google CDN) */
export const ENGLISH_FONTS = [
  { id: "segoe", label: "Segoe UI (Professional)", stack: '"Segoe UI", "Segoe UI Variable", system-ui, -apple-system, sans-serif' },
  { id: "system", label: "System UI", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "arial", label: "Arial", stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: "calibri", label: "Calibri", stack: 'Calibri, "Segoe UI", Candara, Arial, sans-serif' },
  { id: "verdana", label: "Verdana", stack: 'Verdana, Geneva, "Segoe UI", sans-serif' },
] as const;

/** 5 popular Dari (Farsi) fonts — local stacks, Bahij Nazanin first */
export const DARI_FONTS = [
  { id: "bahij", label: "Bahij Nazanin", stack: '"Bahij Nazanin", "Bahij Nassim", "XB Zar", Tahoma, "Segoe UI", Arial, sans-serif' },
  { id: "nassim", label: "Bahij Nassim", stack: '"Bahij Nassim", "Bahij Nazanin", Tahoma, "Segoe UI", Arial, sans-serif' },
  { id: "xbzar", label: "XB Zar", stack: '"XB Zar", "Bahij Nazanin", Tahoma, Arial, sans-serif' },
  { id: "tahoma", label: "Tahoma", stack: 'Tahoma, "Segoe UI", Arial, sans-serif' },
  { id: "trado", label: "Traditional Arabic", stack: '"Traditional Arabic", "Arabic Typesetting", Tahoma, Arial, sans-serif' },
] as const;

/** Pashto fonts — Afghan Kajeki first (local install), then Bahij */
export const PASHTO_FONTS = [
  { id: "kajeki", label: "Afghan Kajeki", stack: '"Afghan Kajeki", "Kajeki", "کجکی", "Bahij Nazanin", Tahoma, "Segoe UI", Arial, sans-serif' },
  { id: "bahij", label: "Bahij Nazanin", stack: '"Bahij Nazanin", "Bahij Nassim", "Afghan Kajeki", Tahoma, Arial, sans-serif' },
  { id: "nassim", label: "Bahij Nassim", stack: '"Bahij Nassim", "Bahij Nazanin", Tahoma, Arial, sans-serif' },
  { id: "tahoma", label: "Tahoma", stack: 'Tahoma, "Segoe UI", Arial, sans-serif' },
  { id: "segoe", label: "Segoe UI", stack: '"Segoe UI", Tahoma, Arial, sans-serif' },
] as const;

const STORAGE_KEY = "shop_settings_v3";

export type AppSettings = {
  currency: CurrencyCode;
  allowDecimals: boolean;
  themePreset: ThemePresetId;
  customColors: ThemeColors | null;
  darkColors: DarkThemeColors;
  darkMode: boolean;
  fontEnglish: string;
  fontDari: string;
  fontPashto: string;
  fontScale: number; // 1 = normal, 1.05–1.2 larger for RTL readability
  fontWeightRtl: "500" | "600" | "700";
};

const DEFAULTS: AppSettings = {
  currency: "AFN",
  allowDecimals: true,
  themePreset: "default",
  customColors: null,
  darkColors: { ...DEFAULT_DARK },
  darkMode: false,
  fontEnglish: "segoe",
  fontDari: "bahij",
  fontPashto: "kajeki",
  fontScale: 1,
  fontWeightRtl: "600",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("shop_settings_v1");
    const legacyTheme = localStorage.getItem("theme");
    let base: AppSettings = {
      ...DEFAULTS,
      darkColors: { ...DEFAULT_DARK },
    };
    if (legacyTheme === "dark") base.darkMode = true;
    if (legacyTheme === "light") base.darkMode = false;
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...base,
      ...parsed,
      darkColors: { ...DEFAULT_DARK, ...(parsed.darkColors || {}) },
      fontEnglish: parsed.fontEnglish || base.fontEnglish,
      fontDari: parsed.fontDari || base.fontDari,
      fontPashto: parsed.fontPashto || base.fontPashto,
      fontScale: parsed.fontScale ?? base.fontScale,
      fontWeightRtl: parsed.fontWeightRtl || base.fontWeightRtl,
    };
  } catch {
    return { ...DEFAULTS, darkColors: { ...DEFAULT_DARK } };
  }
}


function resolveFontStack(lang: "en" | "fa" | "ps", settings: AppSettings): string {
  if (lang === "en") {
    return ENGLISH_FONTS.find((f) => f.id === settings.fontEnglish)?.stack
      ?? ENGLISH_FONTS[0].stack;
  }
  if (lang === "fa") {
    return DARI_FONTS.find((f) => f.id === settings.fontDari)?.stack
      ?? DARI_FONTS[0].stack;
  }
  return PASHTO_FONTS.find((f) => f.id === settings.fontPashto)?.stack
      ?? PASHTO_FONTS[0].stack;
}

function applyFontCss(settings: AppSettings) {
  const root = document.documentElement;
  root.style.setProperty("--font-en", resolveFontStack("en", settings));
  root.style.setProperty("--font-fa", resolveFontStack("fa", settings));
  root.style.setProperty("--font-ps", resolveFontStack("ps", settings));
  // Multiplier on browser default (16px) — professional rem-based scaling
  root.style.setProperty("--font-scale", String(settings.fontScale));
  root.style.setProperty("--font-scale-rtl", String(settings.fontScale));
  root.style.setProperty("--font-weight-rtl", settings.fontWeightRtl);
  // Clear any legacy inline font-size so media queries + rem work
  root.style.fontSize = "";
  if (document.body) document.body.style.fontSize = "";
}

/**
 * Modern defaults:
 * - Light: soft slate page, white cards/sidebar/header
 * - Dark: near-black surfaces; sidebar MATCHES background
 * Brand (primary/button/accent) stays the same in both modes.
 */
const DARK_SURFACES = {
  background: "#0c0c0e",
  foreground: "#ececef",
  card: "#16161a",
  muted: "#222228",
  mutedForeground: "#a1a1aa",
  border: "#2e2e36",
  header: "#0c0c0e",
};

function applyThemeCss(brand: ThemeColors, isDark: boolean) {
  try {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  const primary = brand.primary;
  const accent = brand.accent || brand.primary;
  const button = brand.button || brand.primary;
  const buttonText = brand.buttonText || "#ffffff";

  set("--color-primary", primary);
  set("--color-primary-600", button);
  set("--color-primary-500", accent);
  set("--color-primary-700", primary);
  set("--color-secondary", brand.secondary);
  set("--color-accent", accent);
  set("--color-button", button);
  set("--color-button-text", buttonText);
  set("--color-ring", accent);
  // Nav style flag for Layout (surface sidebar vs colored)
  set("--sidebar-on-surface", isDark || brand.sidebar === brand.background || brand.sidebar === "#ffffff" || brand.sidebar === "#fff" ? "1" : "0");

  if (isDark) {
    const bg = DARK_SURFACES.background;
    set("--color-background", bg);
    set("--color-foreground", DARK_SURFACES.foreground);
    set("--color-card", DARK_SURFACES.card);
    set("--color-card-foreground", DARK_SURFACES.foreground);
    set("--color-muted", DARK_SURFACES.muted);
    set("--color-muted-foreground", DARK_SURFACES.mutedForeground);
    set("--color-border", DARK_SURFACES.border);
    // Sidebar matches page background (premium dark pattern)
    set("--color-sidebar", bg);
    set("--color-sidebar-fg", DARK_SURFACES.foreground);
    set("--color-header", bg);
    set("--color-primary-50", DARK_SURFACES.muted);
    set("--color-primary-100", DARK_SURFACES.muted);
    set("--color-primary-900", DARK_SURFACES.muted);
    // Slightly brighter primary on dark for WCAG contrast
    set("--color-primary", accent);
    set("--color-primary-500", accent);
    set("--color-button", primary);
  } else {
    set("--color-background", brand.background);
    set("--color-foreground", brand.foreground);
    set("--color-card", brand.card);
    set("--color-card-foreground", brand.cardForeground);
    set("--color-muted", brand.muted);
    set("--color-muted-foreground", brand.mutedForeground);
    set("--color-border", brand.border);
    set("--color-sidebar", brand.sidebar);
    set("--color-sidebar-fg", brand.sidebarForeground);
    set("--color-header", brand.header);
    set("--color-primary-50", brand.muted);
    set("--color-primary-100", brand.muted);
    set("--color-primary-900", brand.sidebar);
  }
  } catch (e) {
    console.error("applyThemeCss failed", e);
  }
}

type SettingsContextValue = {
  settings: AppSettings;
  currencySymbol: string;
  activeColors: ThemeColors;
  setCurrency: (c: CurrencyCode) => void;
  setAllowDecimals: (v: boolean) => void;
  setThemePreset: (id: ThemePresetId) => void;
  setCustomColors: (c: ThemeColors | null) => void;
  setDarkColors: (c: Partial<DarkThemeColors>) => void;
  setDarkMode: (v: boolean) => void;
  setFontEnglish: (id: string) => void;
  setFontDari: (id: string) => void;
  setFontPashto: (id: string) => void;
  setFontScale: (n: number) => void;
  setFontWeightRtl: (w: "500" | "600" | "700") => void;
  resetThemeToDefault: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  formatMoney: (value: string | number) => string;
  formatNumber: (value: string | number) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function roundDisplay(n: number, decimals: boolean): string {
  if (isNaN(n) || !isFinite(n)) return decimals ? "0.00" : "0";
  if (!decimals) return Math.round(n).toLocaleString("en-US");
  const r = Math.round((n + Number.EPSILON) * 100) / 100;
  return r.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    return loadSettings();
  });

  const activeColors = useMemo(() => {
    try {
      if (settings.customColors) return settings.customColors;
      return THEME_PRESETS[settings.themePreset]?.colors ?? THEME_PRESETS.default.colors;
    } catch {
      return THEME_PRESETS.default.colors;
    }
  }, [settings.customColors, settings.themePreset]);

  const currencySymbol =
    CURRENCIES.find((c) => c.code === settings.currency)?.symbol ?? "؋";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    applyThemeCss(activeColors, settings.darkMode);
    applyFontCss(settings);
    const root = document.documentElement;
    if (settings.darkMode) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.setItem("theme", settings.darkMode ? "dark" : "light");
  }, [activeColors, settings.darkMode, settings.darkColors, settings.fontEnglish, settings.fontDari, settings.fontPashto, settings.fontScale, settings.fontWeightRtl]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...partial }));
  };

  const formatNumber = (value: string | number) => {
    const n = typeof value === "string" ? parseFloat(value) : value;
    return roundDisplay(n, settings.allowDecimals);
  };

  const formatMoneyFn = (value: string | number) =>
    `${currencySymbol} ${formatNumber(value)}`;

  const value: SettingsContextValue = {
    settings,
    currencySymbol,
    activeColors,
    setCurrency: (c) => updateSettings({ currency: c }),
    setAllowDecimals: (v) => updateSettings({ allowDecimals: v }),
    setThemePreset: (id) =>
      updateSettings({ themePreset: id, customColors: null }),
    setCustomColors: (c) => updateSettings({ customColors: c }),
    setDarkColors: (partial) =>
      updateSettings({
        darkColors: { ...settings.darkColors, ...partial },
      }),
    setDarkMode: (v) => updateSettings({ darkMode: v }),
    setFontEnglish: (id) => updateSettings({ fontEnglish: id }),
    setFontDari: (id) => updateSettings({ fontDari: id }),
    setFontPashto: (id) => updateSettings({ fontPashto: id }),
    setFontScale: (n) => updateSettings({ fontScale: n }),
    setFontWeightRtl: (w) => updateSettings({ fontWeightRtl: w }),
    resetThemeToDefault: () =>
      updateSettings({
        themePreset: "default",
        customColors: null,
        darkColors: { ...DEFAULT_DARK },
        darkMode: false,
      }),
    updateSettings,
    formatMoney: formatMoneyFn,
    formatNumber,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
