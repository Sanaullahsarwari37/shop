import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import { Plus, Search, Package, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

type ProductForm = {
  name: string;
  categoryId: string;
  totalPurchaseCost: string;
  sellingPrice: string;
  quantity: string;
  minStock: string;
  sku: string;
};

const emptyForm = (): ProductForm => ({
  name: "",
  categoryId: "",
  totalPurchaseCost: "",
  sellingPrice: "",
  quantity: "0",
  minStock: "5",
  sku: "",
});

function calcUnitCost(total: string, qty: string): string {
  const t = parseFloat(total);
  const q = parseFloat(qty);
  if (!q || q <= 0 || isNaN(t) || t < 0) return "0.00";
  return (t / q).toFixed(2);
}

function calcTotalSell(qty: string, price: string): string {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  return (q * p).toFixed(2);
}

function calcProfit(totalSell: string, totalCost: string): string {
  return (parseFloat(totalSell || "0") - parseFloat(totalCost || "0")).toFixed(2);
}

export default function Products() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [productTab, setProductTab] = useState<"available" | "sold">("available");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () => api.getProducts(search ? { search } : undefined),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const availableProducts = products.filter((p: any) => (p.quantity ?? 0) > 0);
  const soldOutProducts = products.filter((p: any) => (p.quantity ?? 0) <= 0);
  const filteredProducts =
    productTab === "available" ? availableProducts : soldOutProducts;

  const unitCost = useMemo(
    () => calcUnitCost(form.totalPurchaseCost, form.quantity),
    [form.totalPurchaseCost, form.quantity]
  );
  const totalSell = useMemo(
    () => calcTotalSell(form.quantity, form.sellingPrice),
    [form.quantity, form.sellingPrice]
  );
  const totalProfit = useMemo(
    () => calcProfit(totalSell, form.totalPurchaseCost),
    [totalSell, form.totalPurchaseCost]
  );
  const profitPerUnit = useMemo(() => {
    const q = parseFloat(form.quantity) || 0;
    if (q <= 0) return "0.00";
    return (parseFloat(totalProfit) / q).toFixed(2);
  }, [totalProfit, form.quantity]);

  const createMut = useMutation({
    mutationFn: api.createProduct,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.refetchQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      toast(t("products.saved"), "success");
      closeForm();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.updateProduct(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["products"] });
      await qc.refetchQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["categories"] });
      toast(t("products.saved"), "success");
      closeForm();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDeleteTarget(null);
      toast(t("products.deleted"), "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    const qty = String(p.quantity ?? 0);
    const unit = parseFloat(p.purchasePrice || p.avgCost || "0");
    const total = (unit * (p.quantity || 0)).toFixed(2);
    setForm({
      name: p.name || "",
      categoryId: p.categoryId ? String(p.categoryId) : "",
      totalPurchaseCost: total,
      sellingPrice: String(p.sellingPrice || ""),
      quantity: qty,
      minStock: String(p.minStock ?? 5),
      sku: p.sku || "",
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      purchasePrice: unitCost,
      sellingPrice: form.sellingPrice,
      quantity: Number(form.quantity),
      minStock: Number(form.minStock),
      sku: form.sku || null,
    };
    if (editingId) {
      updateMut.mutate({
        id: editingId,
        data: {
          name: payload.name,
          categoryId: payload.categoryId,
          purchasePrice: payload.purchasePrice,
          sellingPrice: payload.sellingPrice,
          minStock: payload.minStock,
          sku: payload.sku,
          quantity: payload.quantity,
        },
      });
    } else {
      createMut.mutate(payload);
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("products.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("products.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm());
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> {t("products.addProduct")}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("products.searchPlaceholder")}
          className="w-full ps-9 pe-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">
              {editingId ? t("products.editProduct") : t("products.addProduct")}
            </h2>
            <p className="text-xs text-slate-500">{t("products.calcHint")}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                placeholder={t("products.productName")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              >
                <option value="">{t("products.noCategory")}</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.perPrice && parseFloat(c.perPrice) > 0 ? ` (${formatMoney(c.perPrice)})` : ""}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t("products.totalItems")}</label>
                  <input required type="number" min="0" step="1" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t("products.totalAmountItems")}</label>
                  <input required type="number" min="0" step="0.01" value={form.totalPurchaseCost}
                    onChange={(e) => setForm({ ...form, totalPurchaseCost: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t("products.perPrice")}</label>
                  <input required type="number" min="0" step="0.01" value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t("products.minStock")}</label>
                  <input type="number" min="0" value={form.minStock}
                    onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm" />
                </div>
              </div>

              <input placeholder={`${t("products.sku")} (${t("common.optional")})`} value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm" />

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{t("products.costPerPiece")}</span><span className="font-medium">{formatMoney(unitCost)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("products.costCase")}</span><span className="font-medium">{formatMoney(form.totalPurchaseCost || "0")}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("products.valueCase")}</span><span className="font-medium">{formatMoney(totalSell)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{t("products.profitPerUnit")}</span><span className="font-medium">{formatMoney(profitPerUnit)}</span></div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span className="text-slate-500">{t("products.potentialProfit")}</span>
                  <span className={`font-semibold ${parseFloat(totalProfit) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatMoney(totalProfit)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">{t("common.cancel")}</button>
                <button type="submit" disabled={pending} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50">
                  {pending ? t("common.loading") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Available / Sold tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setProductTab("available")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            productTab === "available"
              ? "border-primary-600 text-primary-700 dark:text-primary-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {t("products.tabAvailable")} ({availableProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setProductTab("sold")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            productTab === "sold"
              ? "border-primary-600 text-primary-700 dark:text-primary-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {t("products.tabSoldOut")} ({soldOutProducts.length})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{productTab === "available" ? t("products.noAvailable") : t("products.noSoldOut")}</p>
            <button type="button" onClick={() => setShowForm(true)} className="mt-3 text-sm text-primary-600 hover:underline">{t("products.addFirst")}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-4 py-3 font-medium">{t("products.productName")}</th>
                  <th className="px-4 py-3 font-medium">{t("products.category")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("products.totalItems")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("products.costPerPiece")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("products.perPrice")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("products.costCase")}</th>
                  <th className="px-4 py-3 font-medium text-end">{t("products.potentialProfit")}</th>
                  <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.sku && <div className="text-xs text-slate-500">{p.sku}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.categoryName || "—"}</td>
                    <td className="px-4 py-3 text-end font-medium">{p.quantity}</td>
                    <td className="px-4 py-3 text-end">{formatMoney(p.avgCost)}</td>
                    <td className="px-4 py-3 text-end">{formatMoney(p.sellingPrice)}</td>
                    <td className="px-4 py-3 text-end">{formatMoney(p.costValue)}</td>
                    <td className="px-4 py-3 text-end text-emerald-600">{formatMoney(p.potentialProfit)}</td>
                    <td className="px-4 py-3">
                      {p.quantity === 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("products.outOfStock")}</span>
                      ) : p.quantity <= p.minStock ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t("products.lowStock")}</span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t("products.inStock")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title={t("common.edit")}><Pencil size={14} /></button>
                        <button type="button" onClick={() => setDeleteTarget({ id: p.id, name: p.name })} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t("common.delete")}><Trash2 size={14} /></button>
                      </div>
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
        title={t("products.deleteProduct")}
        message={deleteTarget ? `${deleteTarget.name}: ${t("products.confirmDeleteHistory")}` : t("products.confirmDeleteHistory")}
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
