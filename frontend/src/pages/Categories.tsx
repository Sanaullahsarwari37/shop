import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatMoney } from "../lib/api";
import { Plus, Tags, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Categories() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [perPrice, setPerPrice] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const reset = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setPerPrice("");
    setDescription("");
  };

  const createMut = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast(t("categories.saved"), "success");
      reset();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast(t("categories.saved"), "success");
      reset();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTarget(null);
      toast(t("categories.deleted"), "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name || "");
    setPerPrice(c.perPrice != null ? String(c.perPrice) : "");
    setDescription(c.description || "");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: name.trim(),
      perPrice: perPrice || "0",
      description: description || null,
    };
    if (editingId) updateMut.mutate({ id: editingId, data });
    else createMut.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("categories.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("categories.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> {t("categories.addCategory")}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              {editingId ? t("categories.editCategory") : t("categories.addCategory")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("categories.categoryName")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("categories.perPrice")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={perPrice}
                  onChange={(e) => setPerPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">{t("categories.perPriceHint")}</p>
              </div>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("categories.description")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={reset} className="flex-1 py-2 rounded-lg border text-sm">
                  {t("common.cancel")}
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium">
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <Tags className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{t("categories.noCategories")}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                <th className="px-5 py-3 font-medium text-end">{t("categories.perPrice")}</th>
                <th className="px-5 py-3 font-medium text-end">{t("nav.products")}</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {categories.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-end">{formatMoney(c.perPrice || "0")}</td>
                  <td className="px-5 py-3 text-end">{c.productCount}</td>
                  <td className="px-5 py-3 text-end">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title={t("common.edit")}>
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
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
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("categories.deleteCategory")}
        message={deleteTarget ? `${t("categories.confirmDelete")} (${deleteTarget.name})` : t("categories.confirmDelete")}
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
