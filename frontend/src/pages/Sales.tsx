import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { DeleteAllButton, DeleteSelectedButton } from "../components/ListToolbar";
import { format } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { toLocalYmd } from "../lib/dates";

export default function Sales() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"cash" | "debit">("cash");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [saleDate, setSaleDate] = useState(() => toLocalYmd());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "one" | "bulk" | "all";
    id?: number;
  } | null>(null);
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
      setSaleDate(toLocalYmd());
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
      soldAt: saleDate
        ? new Date(saleDate + "T12:00:00").toISOString()
        : new Date().toISOString(),
    });
  };

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === "one" && deleteTarget.id != null) {
        await api.deleteSale(deleteTarget.id);
      } else if (deleteTarget.type === "bulk") {
        const ids = Array.from(selected);
        const res = await api.deleteSalesBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) throw new Error(failed.map((f: any) => f.error).join("; "));
      } else if (deleteTarget.type === "all") {
        const ids = sales.map((s: any) => s.id as number);
        const res = await api.deleteSalesBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) throw new Error(failed.map((f: any) => f.error).join("; "));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      setSelected(new Set());
      setDeleteTarget(null);
      toast(t("common.deleted") || "Deleted", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("sales.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("sales.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeleteSelectedButton
              label={t("common.deleteSelected", "Delete selected")}
              count={selected.size}
              onClick={() => setDeleteTarget({ type: "bulk" })}
            />
            <DeleteAllButton
              label={t("common.deleteAll", "Delete all")}
              count={sales.length}
              onClick={() => setDeleteTarget({ type: "all" })}
            />
          <button
            type="button"
            onClick={() => {
              setSaleDate(toLocalYmd());
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> {t("sales.newSale")}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("sales.newSale")}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("common.date")}</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
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
          <div className="table-wrap overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === sales.length && sales.length > 0}
                      onChange={() => {
                        if (selected.size === sales.length) setSelected(new Set());
                        else setSelected(new Set(sales.map((s: any) => s.id)));
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("products.productName")}</th>
                  <th className="px-3 py-3 font-medium">{t("sales.type")}</th>
                  <th className="px-3 py-3 font-medium">{t("sales.customer")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("sales.revenue")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("sales.profit")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.map((s: any) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {format(new Date(s.soldAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-3 py-3 font-medium max-w-[180px] truncate" title={s.itemNames || s.note || ""}>
                      {s.itemNames || s.note || "—"}
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-3 py-3">{s.customerName || "—"}</td>
                    <td className="px-3 py-3 text-end font-medium">
                      {formatMoney(s.totalRevenue)}
                    </td>
                    <td className="px-3 py-3 text-end text-emerald-600">
                      {formatMoney(s.totalProfit)}
                    </td>
                    <td className="px-3 py-3 text-end">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: "one", id: s.id })}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                        title={t("common.delete")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteTarget != null}
        title={t("common.delete")}
        message={
          deleteTarget?.type === "all"
            ? (t("sales.confirmDeleteAll") || "Delete ALL sales? Stock and customer balances will be reversed.")
            : deleteTarget?.type === "bulk"
              ? `${t("common.deleteSelected") || "Delete selected"} (${selected.size})?`
              : (t("sales.confirmDelete") || "Delete this sale? Stock will be restored.")
        }
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
