import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { DatePicker } from "../components/ui/date-picker";

export default function Reports() {
  const { t } = useLanguage();
  const now = new Date();
  const [from, setFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: () => api.getReport({ from, to }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("reports.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <DatePicker label={t("reports.from")} value={from} onChange={setFrom} className="min-w-[160px]" />
        <DatePicker label={t("reports.to")} value={to} onChange={setTo} className="min-w-[160px]" />
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading report...</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
              <p className="text-xs text-slate-500">Revenue</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.revenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
              <p className="text-xs text-slate-500">Profit</p>
              <p className="text-xl font-semibold mt-1 text-emerald-600">{formatMoney(data.summary.profit)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
              <p className="text-xs text-slate-500">Cash Sales</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.cashRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
              <p className="text-xs text-slate-500">Debit Sales</p>
              <p className="text-xl font-semibold mt-1">{formatMoney(data.summary.debitRevenue)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b font-medium">Best Selling Products</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-5 py-2 font-medium text-right">Qty</th>
                  <th className="px-5 py-2 font-medium text-right">Revenue</th>
                  <th className="px-5 py-2 font-medium text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.bestSellers?.map((b: any) => (
                  <tr key={b.productId}>
                    <td className="px-5 py-2">{b.productName}</td>
                    <td className="px-5 py-2 text-right">{b.quantity}</td>
                    <td className="px-5 py-2 text-right">{formatMoney(b.revenue)}</td>
                    <td className="px-5 py-2 text-right text-emerald-600">{formatMoney(b.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
