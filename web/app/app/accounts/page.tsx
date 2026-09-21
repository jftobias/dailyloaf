"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth, AuthLoading } from "@/components/route-guards";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { listAccounts, type Account } from "@/lib/api-client";
import { formatMoney } from "@/lib/financial-format";

export default function AccountsPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    listAccounts(selected.id).then((response) => setAccounts(response?.accounts ?? [])).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Accounts could not be loaded.")).finally(() => setLoading(false));
  }, [selected]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  return <FinancialShell title="Accounts">{error ? <FinancialError message={error} /> : loading ? <FinancialLoading /> : <><div className="mb-5 flex justify-end"><Link href="/app/accounts/new" className="rounded-xl bg-[#0f4c4c] px-4 py-3 text-sm font-semibold text-[#fffdf8] focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">Add account</Link></div><div className="grid gap-4 sm:grid-cols-2">{accounts.map((account) => <Link key={account.id} href={`/app/accounts/${account.id}`} className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]"><div className="flex justify-between gap-3"><div><p className="font-semibold">{account.name}</p><p className="mt-1 text-xs capitalize text-[#789089]">{account.account_type.replaceAll("_", " ")} · {account.visibility}{account.archived_at ? " · archived" : ""}</p></div><p className="font-semibold">{formatMoney(account.posted_balance, account.currency_code)}</p></div><p className="mt-4 text-xs text-[#5d716b]">Pending {formatMoney(account.pending_impact, account.currency_code)} · Projected {formatMoney(account.projected_balance, account.currency_code)}</p></Link>)}{accounts.length === 0 && <div className="rounded-2xl border border-dashed border-[#b9c9c0] bg-[#fffdf8] p-8 text-sm text-[#5d716b]">No accounts yet. Add your first account to start tracking balances.</div>}</div></>}</FinancialShell>;
}
