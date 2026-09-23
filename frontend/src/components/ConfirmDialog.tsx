import { useLanguage } from "../i18n/LanguageContext";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Glass / blur confirmation modal — premium designer style */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  if (!open) return null;

  // Only treat as missing i18n key if it looks like a path (e.g. customers.confirmDeleteAll)
  const isI18nPath = (s: string) =>
    !!s && !s.includes(" ") && /^[a-z0-9]+(\.[a-zA-Z0-9]+)+$/.test(s);
  const safeMessage = isI18nPath(message)
    ? t("common.confirm", "Are you sure?")
    : message || t("common.confirm", "Are you sure?");
  const safeTitle = isI18nPath(title)
    ? t("common.delete", "Delete")
    : title || t("common.delete", "Delete");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl p-6 space-y-5"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 100%)",
        }}
      >
        {/* Dark mode override via class on html */}
        <style>{`
          .dark [role="dialog"] {
            background: linear-gradient(145deg, rgba(24,24,27,0.92) 0%, rgba(12,12,14,0.88) 100%) !important;
            border-color: rgba(255,255,255,0.08) !important;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
          }
        `}</style>
        <div className="flex items-start gap-4">
          <div
            className={
              danger
                ? "p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-600/20 text-red-500 ring-1 ring-red-500/30"
                : "p-2.5 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-500 ring-1 ring-amber-500/30"
            }
          >
            <AlertTriangle size={22} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {safeTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {safeMessage}
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {cancelLabel || t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? "flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 shadow-lg shadow-red-500/25 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transition-all"
                : "flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 shadow-lg btn-primary"
            }
          >
            {loading ? t("common.loading") : confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
