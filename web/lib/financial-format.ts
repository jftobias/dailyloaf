/**
 * Presentation-only formatting. API monetary values stay decimal strings
 * end-to-end; Intl is used for display only and never for business math.
 */

export function formatMoney(value: string, currency = "COP", intlLocale = "en-US") {
  try {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return `${value} ${currency}`;
    return new Intl.NumberFormat(intlLocale, { style: "currency", currency, maximumFractionDigits: 4 }).format(amount);
  } catch {
    return `${value} ${currency}`;
  }
}

/** Formats an occurred_on date ("YYYY-MM-DD") or ISO timestamp for display. */
export function formatDate(value: string, intlLocale = "en-US", timeZone = "America/Bogota") {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeZone }).format(date);
}

export function formatDateTime(value: string, intlLocale = "en-US", timeZone = "America/Bogota") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
}

export function monthRange(timeZone = "America/Bogota") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function todayInTimeZone(timeZone = "America/Bogota") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function displayTransactionAmount(kind: "income" | "expense" | "transfer" | "balance_adjustment", value: string) {
  return kind === "expense" || kind === "transfer" || kind === "balance_adjustment" ? value.replace(/^-/, "") : value;
}

export function positiveAmountToImpact(kind: "income" | "expense", amount: string) {
  const normalized = amount.trim();
  return kind === "expense" && !normalized.startsWith("-") ? `-${normalized}` : normalized.replace(/^\+/, "");
}
