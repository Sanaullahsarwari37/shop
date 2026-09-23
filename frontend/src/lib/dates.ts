/** Local calendar date helpers — avoid UTC off-by-one */

export function toLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse yyyy-MM-dd as a local calendar date (noon local to avoid DST edges) */
export function fromLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isValidYmd(ymd: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const d = fromLocalYmd(ymd);
  return toLocalYmd(d) === ymd;
}

export function formatDisplayDate(ymd: string): string {
  if (!isValidYmd(ymd)) return ymd;
  const d = fromLocalYmd(ymd);
  const dd = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${dd} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
