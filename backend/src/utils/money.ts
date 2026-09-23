/** Safe money helpers – always store exactly 2 decimal places, no float garbage */

function round2(n: number): number {
  // Avoid IEEE-754 artifacts (e.g. 1.005 * 100 = 100.49999…)
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Normalize any input to a money string with exactly 2 decimals (for DB storage) */
export function toMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  const n = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (typeof n !== "number" || isNaN(n) || !isFinite(n)) return "0.00";
  return round2(n).toFixed(2);
}

export function moneyAdd(a: string | number, b: string | number): string {
  return toMoney(parseFloat(toMoney(a)) + parseFloat(toMoney(b)));
}

export function moneySub(a: string | number, b: string | number): string {
  return toMoney(parseFloat(toMoney(a)) - parseFloat(toMoney(b)));
}

export function moneyMul(a: string | number, b: string | number): string {
  return toMoney(parseFloat(toMoney(a)) * parseFloat(toMoney(b)));
}

export function moneyDiv(a: string | number, b: string | number): string {
  const divisor = parseFloat(toMoney(b));
  if (divisor === 0) return "0.00";
  return toMoney(parseFloat(toMoney(a)) / divisor);
}

export function parseMoney(value: string | number): number {
  return parseFloat(toMoney(value));
}
