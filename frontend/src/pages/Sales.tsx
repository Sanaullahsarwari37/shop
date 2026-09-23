import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import { Plus, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";

export default function Sales() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"cash" | "debit">("cash");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const qc = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.getSales(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.getCustomers(),
  });

  const createMut = useMutation({
    mutationFn: api.createSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setProductId("");
      setQty("1");
      setCustomerId("");
      toast(t("common.success"), "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      type,
      customerId: type === "debit" ? Number(customerId) : undefined,
      items: [{ productId: Number(productId), quantity: Number(qty) }],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("sales.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("sales.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> {t("sales.newSale")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("sales.newSale")}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("cash")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    type === "cash"
                      ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {t("sales.cash")}
                </button>
                <button
                  type="button"
                  onClick={() => setType("debit")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    type === "debit"
                      ? "bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-900/30"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {t("sales.debit")}
                </button>
              </div>

              {type === "debit" && (
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                >
                  <option value="">{t("sales.selectCustomer")}</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{" "}
                      {parseFloat(c.outstandingBalance) > 0
                        ? `(${formatMoney(c.outstandingBalance)})`
                        : ""}
                    </option>
                  ))}
                </select>
              )}

              <select
                required
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">{t("sales.selectProduct")}</option>
                {products
                  .filter((p: any) => p.quantity > 0)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.quantity} — {formatMoney(p.sellingPrice)}
                    </option>
                  ))}
              </select>

              <input
                required
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder={t("common.quantity")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />

              {createMut.isError && (
                <p className="text-sm text-red-600">
                  {(createMut.error as Error).message}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 rounded-lg border text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {createMut.isPending ? t("common.loading") : t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{t("sales.noSales")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-5 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-5 py-3 font-medium">{t("products.productName")}</th>
                  <th className="px-5 py-3 font-medium">{t("sales.type")}</th>
                  <th className="px-5 py-3 font-medium">{t("sales.customer")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("sales.revenue")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("sales.profit")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((s: any) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3">
                      {format(new Date(s.soldAt), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-3 font-medium max-w-[180px] truncate" title={s.itemNames || s.note || ""}>
                      {s.itemNames || s.note || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          s.type === "debit"
                            ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        }`}
                      >
                        {s.type === "debit" ? t("sales.debit") : t("sales.cash")}
                      </span>
                    </td>
                    <td className="px-5 py-3">{s.customerName || "—"}</td>
                    <td className="px-5 py-3 text-end font-medium">
                      {formatMoney(s.totalRevenue)}
                    </td>
                    <td className="px-5 py-3 text-end text-emerald-600">
                      {formatMoney(s.totalProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
