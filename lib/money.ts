const cache = new Map<string, Intl.NumberFormat>();

/** "EGP 150,000" / "USD 3,200". Whole units; salaries here are monthly gross. */
export function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || !currency) return "";
  let f = cache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
    cache.set(currency, f);
  }
  return `${currency} ${f.format(amount)}`;
}

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
}
