import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { DatePicker } from "../components/ui/date-picker";

export default function Reports() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const now = new Date();
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: () => api.getReport({ from, to }),
  });

  const setPreset = (days: number | "month") => {
    const end = new Date();
    if (days === "month") {
      setFrom(format(startOfMonth(end), "yyyy-MM-dd"));
      setTo(format(endOfMonth(end), "yyyy-MM-dd"));
    } else {
      setFrom(format(subDays(end, days - 1), "yyyy-MM-dd"));
      setTo(format(end, "yyyy-MM-dd"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("reports.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DatePicker label={t("reports.from")} value={from} onChange={setFrom} className="min-w-[160px]" />
        <DatePicker label={t("reports.to")} value={to} onChange={setTo} className="min-w-[160px]" />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPreset(1)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t("dashboard.periodToday")}
          </button>
          <button
            type="button"
            onClick={() => setPreset(7)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t("dashboard.periodWeek")}
          </button>
          <button
            type="button"
            onClick={() => setPreset("month")}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t("dashboard.periodMonth")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">{t("common.loading")}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.revenue")}</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.revenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.profit")}</p>
              <p className="text-xl font-semibold mt-1 text-emerald-600">
                {formatMoney(data.summary.profit)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.cashSales")}</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.cashRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.debitSales")}</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.debitRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.collectedDebit")}</p>
              <p className="text-xl font-semibold mt-1 text-emerald-600">
                {formatMoney(data.summary.paymentsReceived)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <p className="text-xs text-slate-500">{t("reports.transactions")}</p>
              <p className="text-xl font-semibold mt-1">{data.summary.transactions}</p>
            </div>
          </div>

          {/* Daily trend */}
          {(data.dailyTrend || []).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 font-medium">
                {t("reports.dailyTrend")}
              </div>
              <div className="table-wrap overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-5 py-2 font-medium">{t("common.date")}</th>
                      <th className="px-5 py-2 font-medium text-end">{t("reports.revenue")}</th>
                      <th className="px-5 py-2 font-medium text-end">{t("reports.profit")}</th>
                      <th className="px-5 py-2 font-medium text-end">{t("reports.transactions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.dailyTrend.map((row: any) => (
                      <tr key={row.date}>
                        <td className="px-5 py-2">{row.date}</td>
                        <td className="px-5 py-2 text-end">{formatMoney(row.revenue)}</td>
                        <td className="px-5 py-2 text-end text-emerald-600">
                          {formatMoney(row.profit)}
                        </td>
                        <td className="px-5 py-2 text-end">{row.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 font-medium">
              {t("reports.bestSellers")}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-5 py-2 font-medium">{t("products.productName")}</th>
                  <th className="px-5 py-2 font-medium text-end">{t("common.quantity")}</th>
                  <th className="px-5 py-2 font-medium text-end">{t("reports.revenue")}</th>
                  <th className="px-5 py-2 font-medium text-end">{t("reports.profit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data.bestSellers || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  data.bestSellers.map((b: any) => (
                    <tr key={b.productId}>
                      <td className="px-5 py-2">{b.productName}</td>
                      <td className="px-5 py-2 text-end">{b.quantity}</td>
                      <td className="px-5 py-2 text-end">{formatMoney(b.revenue)}</td>
                      <td className="px-5 py-2 text-end text-emerald-600">
                        {formatMoney(b.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(data.byCategory || []).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 font-medium">
                {t("reports.byCategory")}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-5 py-2 font-medium">{t("products.category")}</th>
                    <th className="px-5 py-2 font-medium text-end">{t("common.quantity")}</th>
                    <th className="px-5 py-2 font-medium text-end">{t("reports.revenue")}</th>
                    <th className="px-5 py-2 font-medium text-end">{t("reports.profit")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.byCategory.map((c: any) => (
                    <tr key={c.categoryId ?? "none"}>
                      <td className="px-5 py-2">{c.categoryName || "—"}</td>
                      <td className="px-5 py-2 text-end">{c.quantity}</td>
                      <td className="px-5 py-2 text-end">{formatMoney(c.revenue)}</td>
                      <td className="px-5 py-2 text-end text-emerald-600">
                        {formatMoney(c.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
