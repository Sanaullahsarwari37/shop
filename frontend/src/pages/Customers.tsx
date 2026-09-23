import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useSettings } from "../contexts/SettingsContext";
import { Plus, Users, CreditCard, ArrowLeft, Eye, Pencil, Trash2 } from "lucide-react";
import { DeleteAllButton } from "../components/ListToolbar";
import { format } from "date-fns";
import { useLanguage } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Customers() {
  const { t } = useLanguage();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPay, setShowPay] = useState<number | null>(null);
  const [showLoan, setShowLoan] = useState<number | null>(null);
  const [payBalance, setPayBalance] = useState("0");
  const [loanCash, setLoanCash] = useState("");
  const [loanProductId, setLoanProductId] = useState("");
  const [loanQty, setLoanQty] = useState("1");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id?: number; name?: string; all?: boolean } | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const qc = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.getCustomers(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["customer", selectedId],
    queryFn: () => api.getCustomer(selectedId!),
    enabled: selectedId != null,
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", phone: "", address: "" });
  };

  const createMut = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["customers"] });
      toast(t("common.success"), "success");
      resetForm();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateCustomer(id, data),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["customers"] });
      if (selectedId) await qc.refetchQueries({ queryKey: ["customer", selectedId] });
      toast(t("common.success"), "success");
      resetForm();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      if (deleteTarget.all) {
        const ids = customers.map((c: any) => c.id as number);
        const res = await api.deleteCustomersBulk(ids);
        const failed = (res.results || []).filter((r: any) => !r.ok);
        if (failed.length) throw new Error(failed.map((f: any) => f.error).join("; "));
      } else if (deleteTarget.id != null) {
        await api.deleteCustomer(deleteTarget.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteTarget(null);
      setSelectedId(null);
      toast(t("customers.deleted") || "Deleted", "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const payMut = useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: string }) =>
      api.recordPayment(id, { amount, note: "Cash payment (Nasiya)" }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["customers"] });
      await qc.invalidateQueries({ queryKey: ["customer"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowPay(null);
      setPayAmount("");
      toast(t("common.success"), "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const loanMut = useMutation({
    mutationFn: ({
      id,
      cashAmount,
      productId,
      qty,
    }: {
      id: number;
      cashAmount?: string;
      productId?: string;
      qty?: string;
    }) => {
      const payload: any = { note: "Nasiya loan" };
      if (cashAmount && parseFloat(cashAmount) > 0) payload.cashAmount = cashAmount;
      if (productId) {
        payload.items = [{ productId: Number(productId), quantity: Number(qty || 1) }];
      }
      return api.recordLoan(id, payload);
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["customers"] });
      await qc.invalidateQueries({ queryKey: ["customer"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["sales"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
      setShowLoan(null);
      setLoanCash("");
      setLoanProductId("");
      setLoanQty("1");
      toast(t("common.success"), "success");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      phone: c.phone || "",
      address: c.address || "",
    });
    setShowForm(true);
  };

  const openPay = (id: number, balance: string | number) => {
    setShowPay(id);
    setPayBalance(String(balance));
    setPayAmount("");
  };

  const ledgerEntries = (() => {
    if (!detail) return [];
    const entries: Array<{
      date: string;
      type: "debit" | "payment";
      label: string;
      amount: number;
      sortAt: number;
    }> = [];
    for (const s of detail.debitSales || []) {
      entries.push({
        date: s.soldAt,
        type: "debit",
        label: t("customers.debitSale"),
        amount: parseFloat(s.totalRevenue),
        sortAt: new Date(s.soldAt).getTime(),
      });
    }
    for (const p of detail.payments || []) {
      entries.push({
        date: p.paidAt,
        type: "payment",
        label: t("customers.payment"),
        amount: parseFloat(p.amount),
        sortAt: new Date(p.paidAt).getTime(),
      });
    }
    entries.sort((a, b) => a.sortAt - b.sortAt);
    let bal = 0;
    return entries.map((e) => {
      if (e.type === "debit") bal += e.amount;
      else bal -= e.amount;
      return { ...e, balance: bal };
    });
  })();

  if (selectedId != null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{detail?.name || t("common.loading")}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{t("customers.ledger")}</p>
          </div>
          {detail && (
            <div className="flex gap-2">
              <button type="button" onClick={() => openEdit(detail)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm">
                <Pencil size={14} /> {t("common.edit")}
              </button>
              {parseFloat(detail.remaining) > 0 && (
                <button type="button" onClick={() => openPay(detail.id, detail.remaining)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">
                  <CreditCard size={14} /> {t("customers.recordPayment")}
                </button>
              )}
              <button type="button" onClick={() => setShowLoan(detail.id)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium">
                {t("customers.loan")}
              </button>
            </div>
          )}
        </div>

        {detailLoading ? (
          <p className="text-slate-500">{t("common.loading")}</p>
        ) : detail ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-sm text-slate-500">{t("customers.totalDebit")}</p>
                <p className="text-xl font-semibold mt-1">{formatMoney(detail.totalDebit)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-sm text-slate-500">{t("customers.totalPaid")}</p>
                <p className="text-xl font-semibold mt-1 text-emerald-600">{formatMoney(detail.totalPaid)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-sm text-slate-500">{t("customers.remaining")}</p>
                <p className="text-xl font-semibold mt-1 text-amber-600">{formatMoney(detail.remaining)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-medium">
                {t("customers.transactionHistory")}
              </div>
              {ledgerEntries.length === 0 ? (
                <p className="p-8 text-center text-slate-500">{t("common.noData")}</p>
              ) : (
                <div className="table-wrap overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                        <th className="px-5 py-3 font-medium">{t("common.date")}</th>
                        <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                        <th className="px-5 py-3 font-medium text-end">{t("common.amount")}</th>
                        <th className="px-5 py-3 font-medium text-end">{t("customers.balance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ledgerEntries.map((e, i) => (
                        <tr key={i}>
                          <td className="px-5 py-3 text-slate-500">{format(new Date(e.date), "dd/MM/yyyy")}</td>
                          <td className="px-5 py-3">
                            <span className={e.type === "debit" ? "text-amber-600" : "text-emerald-600"}>{e.label}</span>
                          </td>
                          <td className="px-5 py-3 text-end font-medium">
                            {e.type === "debit" ? "+" : "−"}{formatMoney(e.amount)}
                          </td>
                          <td className="px-5 py-3 text-end font-medium">{formatMoney(e.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}

        {showForm && (
          <CustomerForm
            title={t("common.edit")}
            form={form}
            setForm={setForm}
            onCancel={resetForm}
            onSubmit={() => updateMut.mutate({ id: editingId!, data: form })}
            t={t}
          />
        )}

        {showPay !== null && (
          <PaymentModal
            amount={payAmount}
            setAmount={setPayAmount}
            balance={payBalance}
            onCancel={() => { setShowPay(null); setPayAmount(""); }}
            onConfirm={() => payMut.mutate({ id: showPay, amount: payAmount })}
            onPayFull={() => setPayAmount(payBalance)}
            pending={payMut.isPending}
            error={payMut.error as Error | null}
            t={t}
          />
        )}

        {showLoan !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold">{t("customers.loanTitle")}</h2>
              <input type="number" min="0" step="0.01" value={loanCash} onChange={(e) => setLoanCash(e.target.value)}
                placeholder={t("customers.cashLoan")} className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900" />
              <select value={loanProductId} onChange={(e) => setLoanProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900">
                <option value="">{t("customers.itemLoan")}</option>
                {products.filter((p: any) => p.quantity > 0).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.quantity})</option>
                ))}
              </select>
              {loanProductId && (
                <input type="number" min="1" value={loanQty} onChange={(e) => setLoanQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-slate-900" />
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLoan(null)} className="flex-1 py-2 border rounded-lg text-sm">{t("common.cancel")}</button>
                <button type="button" onClick={() => loanMut.mutate({ id: showLoan, cashAmount: loanCash, productId: loanProductId || undefined, qty: loanQty })}
                  className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm">{t("common.confirm")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("customers.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("customers.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeleteAllButton
            label={t("common.deleteAll", "Delete all")}
            count={customers.length}
            onClick={() => setDeleteTarget({ all: true })}
          />
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary rounded-xl text-sm font-semibold"
          >
            <Plus size={16} /> {t("customers.addCustomer")}
          </button>
        </div>
      </div>

      {showForm && (
        <CustomerForm
          title={editingId ? t("common.edit") : t("customers.addCustomer")}
          form={form}
          setForm={setForm}
          onCancel={resetForm}
          onSubmit={() => {
            if (editingId) updateMut.mutate({ id: editingId, data: form });
            else createMut.mutate(form);
          }}
          t={t}
        />
      )}

      {showPay !== null && (
        <PaymentModal
          amount={payAmount}
          setAmount={setPayAmount}
          balance={payBalance}
          onCancel={() => { setShowPay(null); setPayAmount(""); }}
          onConfirm={() => payMut.mutate({ id: showPay, amount: payAmount })}
          onPayFull={() => setPayAmount(payBalance)}
          pending={payMut.isPending}
          error={payMut.error as Error | null}
          t={t}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-slate-500">{t("common.loading")}</p>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">{t("customers.noCustomers")}</p>
          </div>
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-start text-slate-500">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.phone")}</th>
                  <th className="px-5 py-3 font-medium text-end">{t("customers.outstanding")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c: any) => {
                  const bal = parseFloat(c.outstandingBalance);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3 font-medium">{c.name}</td>
                      <td className="px-5 py-3 text-slate-500">{c.phone || "—"}</td>
                      <td className="px-5 py-3 text-end font-medium">{formatMoney(c.outstandingBalance)}</td>
                      <td className="px-5 py-3">
                        {bal <= 0 ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{t("customers.noDebit")}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t("customers.hasOutstanding")}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-end">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button type="button" onClick={() => setSelectedId(c.id)} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline px-1">
                            <Eye size={14} /> {t("customers.viewAccount")}
                          </button>
                          {bal > 0 && (
                            <button type="button" onClick={() => openPay(c.id, c.outstandingBalance)}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline px-1">
                              <CreditCard size={14} /> {t("common.pay")}
                            </button>
                          )}
                          <button type="button" onClick={() => setShowLoan(c.id)}
                            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline px-1">
                            {t("customers.loan") || "Loan"}
                          </button>
                          <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title={t("common.edit")}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget({ id: c.id, name: c.name })} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t("common.delete")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {showLoan !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t("customers.loanTitle") || "Give loan (Nasiya)"}</h2>
            <p className="text-xs text-slate-500">{t("customers.loanHint") || "Give cash and/or products on credit. Debt increases."}</p>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("customers.cashLoan") || "Cash amount"}</label>
              <input type="number" min="0" step="0.01" value={loanCash} onChange={(e) => setLoanCash(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t("customers.itemLoan") || "Product (optional)"}</label>
              <select value={loanProductId} onChange={(e) => setLoanProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
                <option value="">{t("common.optional")}</option>
                {products.filter((p: any) => p.quantity > 0).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.quantity})</option>
                ))}
              </select>
            </div>
            {loanProductId && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t("common.quantity")}</label>
                <input type="number" min="1" value={loanQty} onChange={(e) => setLoanQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowLoan(null); setLoanCash(""); setLoanProductId(""); }} className="flex-1 py-2 rounded-lg border text-sm">{t("common.cancel")}</button>
              <button type="button" disabled={loanMut.isPending}
                onClick={() => loanMut.mutate({ id: showLoan, cashAmount: loanCash, productId: loanProductId || undefined, qty: loanQty })}
                className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium disabled:opacity-50">{t("common.confirm")}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("common.delete")}
        message={
          deleteTarget?.all
            ? t("customers.confirmDeleteAll", "Delete all customers and their payment history? This cannot be undone.")
            : deleteTarget
              ? `${deleteTarget.name}: ${t("customers.confirmDelete", "Delete this customer and their history?")}`
              : t("customers.confirmDelete", "Delete this customer?")
        }
        danger
        loading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}

function CustomerForm({
  title, form, setForm, onCancel, onSubmit, t,
}: {
  title: string;
  form: { name: string; phone: string; address: string };
  setForm: (f: any) => void;
  onCancel: () => void;
  onSubmit: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
          <input required placeholder={t("customers.customerName")} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <input placeholder={`${t("common.phone")} (${t("common.optional")})`} value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <input placeholder={`${t("common.address")} / ${t("common.note")}`} value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border text-sm">{t("common.cancel")}</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium">{t("common.save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({
  amount, setAmount, balance, onCancel, onConfirm, onPayFull, pending, error, t,
}: {
  amount: string;
  setAmount: (v: string) => void;
  balance: string;
  onCancel: () => void;
  onConfirm: () => void;
  onPayFull: () => void;
  pending: boolean;
  error: Error | null;
  t: (k: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">{t("customers.recordPayment")}</h2>
        <p className="text-sm text-slate-500">
          {t("customers.outstanding")}: <span className="font-semibold text-amber-600">{formatMoney(balance)}</span>
        </p>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={t("customers.paymentAmount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
        <button type="button" onClick={onPayFull}
          className="w-full py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
          {t("common.pay")} {formatMoney(balance)} (full)
        </button>
        {error && <p className="text-sm text-red-600">{error.message}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-lg border text-sm">{t("common.cancel")}</button>
          <button type="button" onClick={onConfirm} disabled={pending || !amount}
            className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}