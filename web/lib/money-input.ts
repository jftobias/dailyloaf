/**
 * Localized money entry. User-facing text is canonicalized to decimal
 * strings with string operations only — never Float — so entered amounts
 * reach the API exactly as typed.
 */

function intlPart(intlLocale: string, value: number, type: string) {
  try {
    return new Intl.NumberFormat(intlLocale).formatToParts(value).find((part) => part.type === type)?.value;
  } catch {
    return undefined;
  }
}

export function decimalSeparatorFor(intlLocale: string) {
  return intlPart(intlLocale, 1.1, "decimal") ?? ".";
}

export function groupSeparatorFor(intlLocale: string) {
  return intlPart(intlLocale, 10000, "group") ?? ",";
}

/**
 * Converts localized entry text to a canonical decimal string ("1234.56"),
 * or null when the text is not a valid amount. Accepts the locale's decimal
 * separator and its grouping separators; when both "." and "," appear, the
 * rightmost one is treated as the decimal separator. Caps fractions at the
 * ledger's 4 decimal places instead of silently rounding.
 */
export function canonicalizeMoneyInput(raw: string, intlLocale: string): string | null {
  let text = raw.trim().replace(/\s/g, "");
  if (!text) return null;
  if (!/^[+-]?[\d.,]+$/.test(text)) return null;

  let negative = false;
  if (text.startsWith("-") || text.startsWith("+")) {
    negative = text.startsWith("-");
    text = text.slice(1);
  }

  const decimalSep = decimalSeparatorFor(intlLocale);
  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;

  let normalized: string;
  if (hasDot && hasComma) {
    // Both present: rightmost separator is the decimal point.
    const decimalChar = lastDot > lastComma ? "." : ",";
    const groupChar = decimalChar === "." ? "," : ".";
    normalized = text.replaceAll(groupChar, "").replace(decimalChar, ".");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const occurrences = text.split(sep).length - 1;
    const fractionLength = text.length - (hasDot ? lastDot : lastComma) - 1;
    const treatAsDecimal = sep === decimalSep || (occurrences === 1 && fractionLength !== 3);
    normalized = treatAsDecimal ? text.replace(sep, ".") : text.replaceAll(sep, "");
  } else {
    normalized = text;
  }

  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) return null;
  return `${negative ? "-" : ""}${normalized}`;
}

/** Groups a canonical decimal string for display; keeps entered decimals. */
export function formatMoneyEntry(canonical: string, intlLocale: string): string {
  const negative = canonical.startsWith("-");
  const [integer, fraction] = canonical.replace(/^-/, "").split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparatorFor(intlLocale));
  const decimals = fraction ? `${decimalSeparatorFor(intlLocale)}${fraction}` : "";
  return `${negative ? "-" : ""}${grouped}${decimals}`;
}
