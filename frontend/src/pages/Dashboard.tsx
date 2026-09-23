import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { toLocalYmd } from "../lib/dates";
import { useLanguage } from "../i18n/LanguageContext";
import { DatePicker } from "../components/ui/date-picker";

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

export default function Dashboard() {
  const { t } = useLanguage();
  const todayStr = toLocalYmd();
  const [selectedDate, setSelectedDate] = useState(() => toLocalYmd());

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
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

      {/* TODAY — always separate */}
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
            subtitle={`Cost ${formatMoney(d.today.cost)}`}
            icon={TrendingUp}
            accent="green"
          />
          <StatCard
            title={t("dashboard.totalCredit")}
            value={formatMoney(d.today.debit)}
            subtitle={`${d.today.debitTransactions} debit`}
            icon={Wallet}
            accent="violet"
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

      {/* Debt collected today */}
      {(d.today.paymentCount > 0 || parseFloat(d.today.paymentsCollected || "0") > 0) && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {t("dashboard.debtCollected") || "Debt collected today"}
            </p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
              {d.today.paymentCount} {t("customers.payment")} · {t("customers.remaining")} {t("common.total").toLowerCase()} reduced
            </p>
          </div>
          <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">
            −{formatMoney(d.today.paymentsCollected)}
          </p>
        </div>
      )}

      {/* Yesterday quick comparison */}
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
              subtitle={`Cost ${formatMoney(d.selected.cost)}`}
              icon={TrendingUp}
              accent="slate"
            />
            <StatCard
              title={t("dashboard.totalCredit")}
              value={formatMoney(d.selected.debit)}
              subtitle={`${d.selected.debitTransactions}`}
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

      {/* Sales list for selected day */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-medium flex items-center justify-between">
          <span>
            {isToday
              ? t("dashboard.recentSales")
              : `${t("dashboard.selectedDay") || "Day"} ${d.selected.date}`}
          </span>
          <span className="text-xs text-slate-500 font-normal">
            {(d.daySalesList || []).length} records
          </span>
        </div>
        {(d.daySalesList || []).length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">{t("common.noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-5 py-2 font-medium">{t("common.date")}</th>
                  <th className="px-5 py-2 font-medium">{t("products.productName")}</th>
                  <th className="px-5 py-2 font-medium">{t("sales.type")}</th>
                  <th className="px-5 py-2 font-medium">{t("sales.customer")}</th>
                  <th className="px-5 py-2 font-medium text-end">{t("sales.revenue")}</th>
                  <th className="px-5 py-2 font-medium text-end">{t("sales.profit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(d.daySalesList || []).map((s: any) => {
                  const isPay = s.kind === "payment" || s.type === "payment";
                  const when = s.at || s.soldAt;
                  const amount = s.amount ?? s.totalRevenue;
                  const profit = s.profit ?? s.totalProfit;
                  return (
                  <tr key={s.id}>
                    <td className="px-5 py-2 text-slate-500">
                      {format(new Date(when), "HH:mm")}
                    </td>
                    <td className="px-5 py-2 font-medium max-w-[200px] truncate" title={s.itemNames || s.note || ""}>
                      {s.itemNames || s.note || "—"}
                    </td>
                    <td className="px-5 py-2">
                      {isPay ? (
                        <span className="text-emerald-600 font-medium">{t("customers.payment")}</span>
                      ) : s.type === "debit" ? (
                        t("sales.debit")
                      ) : (
                        t("sales.cash")
                      )}
                    </td>
                    <td className="px-5 py-2">{s.customerName || "—"}</td>
                    <td className={`px-5 py-2 text-end font-medium ${isPay ? "text-emerald-600" : ""}`}>
                      {isPay ? "−" : ""}{formatMoney(amount)}
                    </td>
                    <td className="px-5 py-2 text-end text-emerald-600">
                      {isPay ? "—" : formatMoney(profit)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
