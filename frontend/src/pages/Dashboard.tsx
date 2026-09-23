import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Wallet,
  CalendarDays,
  HandCoins,
} from "lucide-react";
import { toLocalYmd } from "../lib/dates";
import { useLanguage } from "../i18n/LanguageContext";
import { DatePicker } from "../components/ui/date-picker";
import { cn } from "../lib/utils";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "blue",
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[accent]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

type ProfitPeriod = "today" | "week" | "month";

export default function Dashboard() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const todayStr = toLocalYmd();
  const [selectedDate, setSelectedDate] = useState(() => toLocalYmd());
  const [profitPeriod, setProfitPeriod] = useState<ProfitPeriod>("today");

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", selectedDate],
    queryFn: () => api.getDashboard(selectedDate),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        {t("common.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        {(error as Error).message}
      </div>
    );
  }

  const d = data;
  const isToday = d.isTodaySelected;
  const pp = d.profitPeriods || {};
  const periodData =
    profitPeriod === "week" ? pp.week : profitPeriod === "month" ? pp.month : pp.today;

  const periodLabel =
    profitPeriod === "week"
      ? t("dashboard.profitWeek")
      : profitPeriod === "month"
        ? t("dashboard.profitMonth")
        : t("dashboard.profitToday");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-kpi text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <DatePicker
          label={t("dashboard.pickDay") || "Select day"}
          value={selectedDate}
          onChange={setSelectedDate}
          className="min-w-[180px]"
        />
      </div>

      {/* TODAY cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {t("dashboard.todaySection") || "Today"} ({todayStr})
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.todaySales")}
            value={formatMoney(d.today.sales)}
            subtitle={`${d.today.transactions} tx · ${d.today.itemsSold} items`}
            icon={ShoppingCart}
            accent="blue"
          />
          <StatCard
            title={t("dashboard.todayProfit")}
            value={formatMoney(d.today.profit)}
            subtitle={`${d.today.transactions} ${t("dashboard.transactions") || "transactions"}`}
            icon={TrendingUp}
            accent="green"
          />
          <StatCard
            title={t("dashboard.collectedDebit")}
            value={formatMoney(d.collectedDebit?.today ?? d.today.paymentsCollected ?? "0")}
            subtitle={`${d.collectedDebit?.todayCount ?? d.today.paymentCount ?? 0} ${t("customers.payment")}`}
            icon={HandCoins}
            accent="emerald"
          />
          <StatCard
            title={t("dashboard.outstandingDebt")}
            value={formatMoney(d.outstanding.total)}
            subtitle={`${d.outstanding.customers} ${t("dashboard.debtors")}`}
            icon={Users}
            accent="amber"
          />
        </div>
      </div>

      {/* Profit performance by period */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {t("dashboard.profitPerformance")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("dashboard.profitPerformanceHint")}</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            {(["today", "week", "month"] as ProfitPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfitPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  profitPeriod === p
                    ? "bg-primary-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {p === "today"
                  ? t("dashboard.periodToday")
                  : p === "week"
                    ? t("dashboard.periodWeek")
                    : t("dashboard.periodMonth")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500">{periodLabel}</p>
            <p className="text-kpi text-2xl font-semibold text-emerald-600 mt-1">
              {formatMoney(periodData?.profit ?? "0")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("dashboard.periodRevenue")}</p>
            <p className="text-xl font-semibold mt-1">
              {formatMoney(periodData?.revenue ?? "0")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t("dashboard.transactions")}</p>
            <p className="text-xl font-semibold mt-1">{periodData?.count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Yesterday + Stock */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {t("dashboard.yesterday") || "Yesterday"} — {t("dashboard.todaySales")}
          </p>
          <p className="text-lg font-semibold mt-1">{formatMoney(d.yesterday.sales)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("dashboard.todayProfit")}: {formatMoney(d.yesterday.profit)} · {d.yesterday.transactions} tx
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {t("dashboard.stockValue")}
          </p>
          <p className="text-lg font-semibold mt-1">{formatMoney(d.inventory.stockValue)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {d.inventory.totalProducts} {t("dashboard.totalProducts")} · {d.inventory.lowStock} {t("dashboard.lowStock")}
          </p>
        </div>
      </div>

      {/* Selected day (if not today) */}
      {!isToday && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 mb-3">
            {t("dashboard.selectedDay") || "Selected day"} ({d.selected.date})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title={t("dashboard.todaySales")}
              value={formatMoney(d.selected.sales)}
              subtitle={`${d.selected.transactions} tx`}
              icon={ShoppingCart}
              accent="slate"
            />
            <StatCard
              title={t("dashboard.todayProfit")}
              value={formatMoney(d.selected.profit)}
              subtitle={`${d.selected.transactions} tx`}
              icon={TrendingUp}
              accent="slate"
            />
            <StatCard
              title={t("dashboard.collectedDebit")}
              value={formatMoney(d.selected.paymentsCollected || "0")}
              subtitle={`${d.selected.paymentCount || 0} ${t("customers.payment")}`}
              icon={Wallet}
              accent="slate"
            />
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-sm font-medium text-slate-500">
                {t("dashboard.previousDay") || "Day before"} ({d.previousDay.date})
              </p>
              <p className="mt-1 text-xl font-semibold">{formatMoney(d.previousDay.sales)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t("dashboard.todayProfit")}: {formatMoney(d.previousDay.profit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top debtors (compact) */}
      {(d.topDebtors || []).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-medium text-sm">
            {t("dashboard.topDebtors") || "Top debtors"}
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(d.topDebtors || []).map((c: any) => (
              <li key={c.id} className="px-5 py-2.5 flex justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-amber-600 font-medium">{formatMoney(c.outstandingBalance)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
