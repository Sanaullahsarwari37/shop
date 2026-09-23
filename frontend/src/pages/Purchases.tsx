import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import { Plus, Truck } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";

export default function Purchases() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
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

  const createMut = useMutation({
    mutationFn: api.createPurchase,
    onSuccess: async () => {
      // Also update selling price on product if provided
      if (productId && sellingPrice) {
        try {
          await api.updateProduct(Number(productId), { sellingPrice });
        } catch {}
      }
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast(t("purchases.saved"), "success");
      setShowForm(false);
      setCategoryId("");
      setProductId("");
      setQty("1");
      setTotalAmount("");
      setSellingPrice("");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("purchases.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("purchases.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> {t("purchases.addPurchase")}
        </button>
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
                });
              }}
              className="space-y-3"
            >
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
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
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm">
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {t("common.confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{t("purchases.noPurchases")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-5 py-3 font-medium">{t("common.date")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("purchases.totalCost")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.note")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchases.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3">{format(new Date(p.purchasedAt), "dd MMM yyyy HH:mm")}</td>
                    <td className="px-5 py-3 text-end font-medium">{formatMoney(p.totalCost)}</td>
                    <td className="px-5 py-3 text-slate-500">{p.note || "—"}</td>
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
