import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { Pencil, Trash2 } from "lucide-react";
import { DeleteAllButton } from "../components/ListToolbar";

export default function Inventory() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id?: number; name?: string; all?: boolean } | null>(null);
  const [form, setForm] = useState({ sellingPrice: "", minStock: "", quantity: "" });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateProduct(id, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["products"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast(t("products.saved"), "success");
      setEditItem(null);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.all) {
        const list = products || [];
        const ids = list.map((x: any) => x.id as number);
        const res = await api.deleteProductsBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) throw new Error(failed.map((f: any) => f.error).join("; "));
      } else if (deleteTarget.id != null) {
        await api.deleteProduct(deleteTarget.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      setDeleteTarget(null);
      toast(t("products.deleted") || "Deleted", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const openEdit = (p: any) => {
    setEditItem(p);
    setForm({
      sellingPrice: String(p.sellingPrice ?? ""),
      minStock: String(p.minStock ?? 5),
      quantity: String(p.quantity ?? 0),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("inventory.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("inventory.subtitle")}</p>
        </div>
        <DeleteAllButton
          label={t("common.deleteAll", "Delete all")}
          count={products.length}
          onClick={() => setDeleteTarget({ all: true })}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t("products.noProducts")}</p>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-5 py-3 font-medium">{t("products.productName")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("products.costPerPiece")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("products.totalCost")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("products.potentialProfit")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("products.remainingItems")}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium">
                      {p.name}
                      {p.quantity === 0 && (
                        <span className="ms-2 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          {t("products.soldOut")}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-end">{formatMoney(p.avgCost)}</td>
                    <td className="px-5 py-3 text-end">{formatMoney(p.costValue)}</td>
                    <td className="px-5 py-3 text-end text-emerald-600">
                      {formatMoney(p.potentialProfit)}
                    </td>
                    <td className="px-5 py-3 text-end font-medium">
                      {p.quantity === 0 ? (
                        <span className="text-red-600">{t("products.soldOut")}</span>
                      ) : (
                        p.quantity
                      )}
                    </td>
                    <td className="px-5 py-3 text-end">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                          title={t("common.edit")}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                          title={t("common.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {t("products.editProduct")}: {editItem.name}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMut.mutate({
                  id: editItem.id,
                  data: {
                    sellingPrice: form.sellingPrice,
                    minStock: Number(form.minStock),
                    quantity: Number(form.quantity),
                  },
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  {t("products.remainingItems")}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("products.perPrice")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("products.minStock")}</label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 py-2 rounded-lg border text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={updateMut.isPending}
                  className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("products.deleteProduct")}
        message={
          deleteTarget?.all
            ? t("products.confirmDeleteAll", "Delete all products? This cannot be undone.")
            : deleteTarget
              ? `${deleteTarget.name}: ${t("products.confirmDeleteHistory", "Delete this product?")}`
              : t("products.confirmDeleteHistory", "Delete?")
        }
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
