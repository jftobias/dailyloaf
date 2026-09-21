export function formatMoney(value: string, currency = "COP") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 4 }).format(Number(value));
  } catch {
    return `${value} ${currency}`;
  }
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
