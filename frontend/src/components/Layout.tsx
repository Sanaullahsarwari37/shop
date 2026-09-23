import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../lib/utils";
import { useLanguage } from "../i18n/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import type { Locale } from "../i18n";

export default function Layout() {
  const { t, locale, setLocale, dir, locales } = useLanguage();
  const { settings, setDarkMode } = useSettings();
  const dark = settings.darkMode;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "1"
  );
  const [langOpen, setLangOpen] = useState(false);


  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const nav = [
    { to: "/", icon: LayoutDashboard, key: "dashboard" },
    { to: "/products", icon: Package, key: "products" },
    { to: "/categories", icon: Tags, key: "categories" },
    { to: "/inventory", icon: Package, key: "inventory" },
    { to: "/purchases", icon: Truck, key: "purchases" },
    { to: "/sales", icon: ShoppingCart, key: "sales" },
    { to: "/customers", icon: Users, key: "customers" },
    { to: "/reports", icon: BarChart3, key: "reports" },
    { to: "/settings", icon: Settings, key: "settings" },
  ];

  const isRtl = dir === "rtl";
  const sidebarW = collapsed ? "w-[72px]" : "w-64";

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      {/* Sidebar — fixed height, does not scroll with main content */}
      <aside
        className={cn(
          "app-sidebar fixed inset-y-0 z-40 flex flex-col h-screen border",
          "transform transition-all duration-200",
          "lg:static lg:translate-x-0 lg:shrink-0",
          sidebarW,
          isRtl ? "right-0 border-l" : "left-0 border-r",
          mobileOpen
            ? "translate-x-0"
            : isRtl
              ? "translate-x-full"
              : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex items-center h-16 shrink-0 px-3 border-b border-[var(--color-border)]",
            collapsed ? "justify-center" : "justify-between px-5"
          )}
        >
          {!collapsed && (
            <span className="font-semibold text-lg tracking-tight truncate">
              {t("appName")}
            </span>
          )}
          <button
            type="button"
            className="lg:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
          <button
            type="button"
            className="hidden lg:inline-flex p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Nav can scroll internally if many items — sidebar itself stays fixed */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 overscroll-contain">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              title={t(`nav.${item.key}`)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-sidebar-fg)]/70 hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-[var(--color-sidebar-fg)]"
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="truncate">{t(`nav.${item.key}`)}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main column — only this area scrolls */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="app-header sticky top-0 z-20 h-14 sm:h-16 shrink-0 backdrop-blur border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
          
          </div>
          <div className="flex-1" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t("settings.language")}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">
                {locales.find((l) => l.code === locale)?.label}
              </span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div
                  className={cn(
                    "absolute top-full mt-1 z-50 min-w-[140px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1",
                    isRtl ? "left-0" : "right-0"
                  )}
                >
                  {locales.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLocale(l.code as Locale);
                        setLangOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-sm text-start hover:bg-slate-100 dark:hover:bg-slate-800",
                        locale === l.code &&
                          "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!dark)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t("settings.theme")}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="app-main flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
