import { Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Destructive bulk action — outline danger, clear label, no count badge.
 */
export function DeleteAllButton({
  label,
  count,
  disabled,
  onClick,
  className,
}: {
  label: string;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  if (disabled || (count !== undefined && count <= 0)) return null;

  // Never show raw i18n paths like "common.deleteAll"
  const safeLabel =
    !label || label.includes(".") ? "Delete all" : label;

  return (
    <button
      type="button"
      onClick={onClick}
      title={safeLabel}
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium",
        "border border-red-200 text-red-600 bg-white",
        "hover:bg-red-50 hover:border-red-300",
        "dark:border-red-900/50 dark:text-red-400 dark:bg-transparent",
        "dark:hover:bg-red-950/40 transition-colors",
        className
      )}
    >
      <Trash2 size={15} className="shrink-0 opacity-90" strokeWidth={2} />
      <span>{safeLabel}</span>
    </button>
  );
}

export function DeleteSelectedButton({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  if (count <= 0) return null;
  const safeLabel =
    !label || label.includes(".") ? "Delete selected" : label;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium",
        "border border-amber-200 text-amber-800 bg-amber-50/80",
        "hover:bg-amber-100",
        "dark:border-amber-900/40 dark:text-amber-300 dark:bg-amber-950/30",
        "dark:hover:bg-amber-950/50 transition-colors"
      )}
    >
      <Trash2 size={15} strokeWidth={2} />
      <span>{safeLabel}</span>
      <span className="inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1.5 rounded-md bg-amber-600 text-white text-[11px] font-semibold tabular-nums">
        {count}
      </span>
    </button>
  );
}
