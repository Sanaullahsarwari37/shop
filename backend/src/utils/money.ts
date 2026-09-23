/** Safe money helpers – avoid floating point issues */
export function toMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "0.00";
  return n.toFixed(2);
}

export function moneyAdd(a: string | number, b: string | number): string {
  return (parseFloat(toMoney(a)) + parseFloat(toMoney(b))).toFixed(2);
}

export function moneySub(a: string | number, b: string | number): string {
  return (parseFloat(toMoney(a)) - parseFloat(toMoney(b))).toFixed(2);
}

export function moneyMul(a: string | number, b: string | number): string {
  return (parseFloat(toMoney(a)) * parseFloat(toMoney(b))).toFixed(2);
}

export function moneyDiv(a: string | number, b: string | number): string {
  const divisor = parseFloat(toMoney(b));
  if (divisor === 0) return "0.00";
  return (parseFloat(toMoney(a)) / divisor).toFixed(2);
}

export function parseMoney(value: string | number): number {
  return parseFloat(toMoney(value));
}
