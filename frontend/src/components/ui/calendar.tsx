import { useMemo, useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export function Calendar({
  selected,
  onSelect,
  className,
  month: controlledMonth,
  onMonthChange,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState(
    selected ? startOfMonth(selected) : startOfMonth(new Date())
  );
  const month = controlledMonth ? startOfMonth(controlledMonth) : internalMonth;

  useEffect(() => {
    if (selected && !controlledMonth) {
      setInternalMonth(startOfMonth(selected));
    }
  }, [selected, controlledMonth]);

  const setMonth = (m: Date) => {
    if (onMonthChange) onMonthChange(m);
    else setInternalMonth(m);
  };

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [month]);

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div
      className={cn(
        "w-[320px] max-w-[calc(100vw-1rem)]",
        "select-none rounded-2xl border border-slate-200/80 dark:border-slate-700",
        "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
        "shadow-xl shadow-slate-900/10 dark:shadow-black/40",
        "p-3 sm:p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <button
          type="button"
          onClick={() => setMonth(subMonths(month, 1))}
          className="h-9 w-9 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-sm font-semibold tracking-tight text-center truncate px-1">
          {format(month, "MMMM yyyy")}
        </div>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="h-9 w-9 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1 sm:mb-2">
        {weekDays.map((d) => (
          <div
            key={d}
            className="h-8 flex items-center justify-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 sm:gap-y-1">
        {weeks.flat().map((day) => {
          const outside = !isSameMonth(day, month);
          const selectedDay = selected && isSameDay(day, selected);
          const today = isToday(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect?.(day)}
              className={cn(
                "relative h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all",
                "touch-manipulation active:scale-95",
                outside && "text-slate-300 dark:text-slate-600 font-normal",
                !outside &&
                  !selectedDay &&
                  "text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
                selectedDay &&
                  "bg-primary-600 text-white shadow-md shadow-primary-600/30 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400",
                today &&
                  !selectedDay &&
                  "ring-2 ring-primary-500/40 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            const n = new Date();
            setMonth(startOfMonth(n));
            onSelect?.(n);
          }}
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline py-1 px-1"
        >
          Today
        </button>
        {selected && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {format(selected, "dd MMM yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}
