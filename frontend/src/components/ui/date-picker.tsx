import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import { cn } from "../../lib/utils";
import {
  toLocalYmd,
  fromLocalYmd,
  isValidYmd,
  formatDisplayDate,
} from "../../lib/dates";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function DatePicker({ value, onChange, label, className }: DatePickerProps) {
  const today = toLocalYmd();
  const effective = isValidYmd(value) ? value : today;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isValidYmd(value)) onChange(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Position calendar so it never overflows the viewport
  useEffect(() => {
    if (!open || !btnRef.current) return;

    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const calW = Math.min(320, window.innerWidth - 16);
      const calH = 360;
      const gap = 8;

      // Prefer below the button, align to the end (right) of the button
      let left = rect.right - calW;
      let top = rect.bottom + gap;

      // Keep inside horizontal viewport
      if (left < 8) left = 8;
      if (left + calW > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - calW - 8);
      }

      // If not enough space below, open above
      if (top + calH > window.innerHeight - 8 && rect.top > calH + gap) {
        top = rect.top - calH - gap;
      }
      // Clamp vertical
      if (top < 8) top = 8;

      setPos({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = fromLocalYmd(effective);

  return (
    <div className={cn("relative w-full sm:w-auto", className)} ref={ref}>
      {label && (
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
          {label}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex w-full sm:min-w-[200px] items-center justify-between gap-2 rounded-lg border px-3 py-2.5 sm:py-2 text-sm",
          "border-slate-200 dark:border-slate-700",
          "bg-white dark:bg-slate-900",
          "text-slate-900 dark:text-slate-100",
          "hover:bg-slate-50 dark:hover:bg-slate-800",
          open && "ring-2 ring-primary-500/40 border-primary-400"
        )}
      >
        <span className="truncate">
          {formatDisplayDate(effective)}
          {effective === today ? (
            <span className="ms-2 text-xs text-primary-600 dark:text-primary-400 font-medium whitespace-nowrap">
              (Today)
            </span>
          ) : null}
        </span>
        <CalendarIcon size={16} className="text-slate-500 dark:text-slate-400 shrink-0" />
      </button>

      {open && pos && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50"
            style={{ top: pos.top, left: pos.left }}
          >
            <Calendar
              selected={selected}
              onSelect={(d) => {
                onChange(toLocalYmd(d));
                setOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
