import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { Plus, Truck, Trash2 } from "lucide-react";
import { DeleteAllButton, DeleteSelectedButton } from "../components/ListToolbar";
import { format } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { toLocalYmd } from "../lib/dates";

export default function Purchases() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => toLocalYmd());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "one" | "item" | "bulk" | "all";
    id?: number;
    label?: string;
  } | null>(null);
  const qc = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: api.getPurchases,
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const filteredProducts = useMemo(() => {
    if (!categoryId) return products;
    return products.filter((p: any) => String(p.categoryId) === categoryId);
  }, [products, categoryId]);

  const unitCost = useMemo(() => {
    const q = parseFloat(qty);
    const tot = parseFloat(totalAmount);
    if (!q || q <= 0 || isNaN(tot)) return "0.00";
    return (tot / q).toFixed(2);
  }, [qty, totalAmount]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["purchases"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const createMut = useMutation({
    mutationFn: api.createPurchase,
    onSuccess: async () => {
      if (productId && sellingPrice) {
        try {
          await api.updateProduct(Number(productId), { sellingPrice });
        } catch {}
      }
      invalidate();
      toast(t("purchases.saved"), "success");
      setShowForm(false);
      setCategoryId("");
      setProductId("");
      setQty("1");
      setTotalAmount("");
      setSellingPrice("");
      setPurchaseDate(toLocalYmd());
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.type === "one" && deleteTarget.id != null) {
        await api.deletePurchase(deleteTarget.id);
      } else if (deleteTarget.type === "item" && deleteTarget.id != null) {
        await api.deletePurchaseItem(deleteTarget.id);
      } else if (deleteTarget.type === "bulk") {
        const ids = Array.from(selected);
        if (!ids.length) throw new Error("No rows selected");
        const res = await api.deletePurchasesBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) {
          throw new Error(
            failed.map((f: any) => `#${f.id}: ${f.error}`).join("; ")
          );
        }
      } else if (deleteTarget.type === "all") {
        const ids = purchases.map((p: any) => p.id as number);
        if (!ids.length) return;
        const res = await api.deletePurchasesBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) {
          throw new Error(
            `${failed.length} failed: ` +
              failed.map((f: any) => f.error).join("; ")
          );
        }
      }
    },
    onSuccess: () => {
      invalidate();
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

  const toggleAll = () => {
    if (selected.size === purchases.length) setSelected(new Set());
    else setSelected(new Set(purchases.map((p: any) => p.id)));
  };

  const confirmMessage = () => {
    if (!deleteTarget) return "";
    if (deleteTarget.type === "one")
      return t("purchases.confirmDelete") || "Delete this purchase? Stock will be reduced.";
    if (deleteTarget.type === "item")
      return t("purchases.confirmDeleteItem") || "Delete this purchase item? Stock will be reduced.";
    if (deleteTarget.type === "bulk")
      return `${t("common.deleteSelected") || "Delete selected"} (${selected.size})?`;
    return t("purchases.confirmDeleteAll") || "Delete ALL purchases? This cannot be undone.";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("purchases.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("purchases.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeleteSelectedButton
            label={t("common.deleteSelected", "Delete selected")}
            count={selected.size}
            onClick={() => setDeleteTarget({ type: "bulk" })}
          />
          <DeleteAllButton
            label={t("common.deleteAll", "Delete all")}
            count={purchases.length}
            onClick={() => setDeleteTarget({ type: "all" })}
          />
          <button
            type="button"
            onClick={() => {
              setPurchaseDate(toLocalYmd());
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> {t("purchases.addPurchase")}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("purchases.recordPurchase")}</h2>
            <p className="text-xs text-slate-500">{t("purchases.calcUnit")}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate({
                  items: [
                    {
                      productId: Number(productId),
                      quantity: Number(qty),
                      unitCost,
                    },
                  ],
                  purchasedAt: purchaseDate
                    ? new Date(purchaseDate + "T12:00:00").toISOString()
                    : new Date().toISOString(),
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("common.date")}</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setProductId("");
                  const cat = categories.find((c: any) => String(c.id) === e.target.value);
                  if (cat?.perPrice && parseFloat(cat.perPrice) > 0 && qty) {
                    setTotalAmount(
                      (parseFloat(cat.perPrice) * (parseFloat(qty) || 1)).toFixed(2)
                    );
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">{t("purchases.selectCategory")}</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.perPrice && parseFloat(c.perPrice) > 0
                      ? ` — ${formatMoney(c.perPrice)}`
                      : ""}
                  </option>
                ))}
              </select>

              <select
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x: any) => String(x.id) === e.target.value);
                  if (p) {
                    setSellingPrice(String(p.sellingPrice || ""));
                    if (!categoryId && p.categoryId) setCategoryId(String(p.categoryId));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">{t("purchases.selectProduct")}</option>
                {filteredProducts.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity})
                  </option>
                ))}
              </select>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("purchases.pieces")}</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("purchases.totalAmount")}</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("purchases.perPriceSell")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm flex justify-between">
                <span className="text-slate-500">{t("purchases.unitCost")}</span>
                <span className="font-medium">{formatMoney(unitCost)}</span>
              </div>

              {createMut.isError && (
                <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border rounded-lg text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="flex-1 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="app-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{t("purchases.noPurchases")}</p>
          </div>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === purchases.length && purchases.length > 0}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">{t("products.productName")}</th>
                  <th className="px-3 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-3 py-3 font-medium">{t("products.category")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("purchases.pieces")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("products.costPerPiece")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("purchases.totalCost")}</th>
                  <th className="px-3 py-3 font-medium text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{p.productName || "—"}</td>
                    <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                      {format(new Date(p.purchasedAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{p.categoryName || "—"}</td>
                    <td className="px-3 py-3 text-end">{p.quantity ?? "—"}</td>
                    <td className="px-3 py-3 text-end">{formatMoney(p.unitCost || "0")}</td>
                    <td className="px-3 py-3 text-end font-medium">{formatMoney(p.totalCost)}</td>
                    <td className="px-3 py-3 text-end">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            type: "one",
                            id: p.id,
                            label: p.productName,
                          })
                        }
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
        message={confirmMessage()}
        confirmLabel={t("common.delete")}
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
