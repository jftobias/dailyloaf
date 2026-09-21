export function formatMoney(value: string, currency = "COP") {
  return `${value} ${currency}`;
}

export function monthRange(timeZone = "America/Bogota") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const pad = (value: number) => String(value).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay)}` };
}

export function positiveAmountToImpact(kind: "income" | "expense", amount: string) {
  const normalized = amount.trim();
  return kind === "expense" && !normalized.startsWith("-") ? `-${normalized}` : normalized.replace(/^\+/, "");
}
