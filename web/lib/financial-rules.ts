import type { Account, Category } from "@/lib/api-client";

export function compatibleTransferAccounts(accounts: Account[], sourceId: number) {
  const source = accounts.find((account) => account.id === sourceId);
  if (!source) return [];
  return accounts.filter((account) => account.id !== sourceId && account.currency_code === source.currency_code && account.visibility === source.visibility && (account.visibility === "shared" || account.private_owner_id === source.private_owner_id));
}

export function availableCategories(categories: Category[], kind: "income" | "expense", account?: Account) {
  return categories.filter((category) => category.kind === kind && !category.archived_at && (category.visibility === "shared" || category.private_owner_id === account?.private_owner_id));
}
