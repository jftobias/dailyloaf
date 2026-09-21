import type { Account, Category } from "@/lib/api-client";
import type { TFunction } from "@/lib/i18n/dictionary";

/**
 * Presentation-boundary helpers: persisted identifiers and enum values are
 * never translated — only their user-facing labels are mapped here.
 */

export function accountTypeLabel(type: Account["account_type"], t: TFunction) {
  return t(`accountTypes.${type}`);
}

export function visibilityLabel(visibility: "shared" | "private", t: TFunction) {
  return t(`visibility.${visibility}`);
}

export function statusLabel(status: "pending" | "posted", t: TFunction) {
  return t(`status.${status}`);
}

export function kindLabel(kind: "income" | "expense" | "transfer" | "balance_adjustment", t: TFunction) {
  return t(`kinds.${kind}`);
}

/**
 * Built-in default categories keep canonical persisted names on the API; only
 * their display label is localized. User-created and archived custom names
 * always render verbatim.
 */
export function categoryLabel(category: Pick<Category, "name" | "is_default">, t: TFunction) {
  if (!category.is_default) return category.name;
  const key = `categories.defaults.${category.name}`;
  const localized = t(key);
  return localized === key ? category.name : localized;
}
