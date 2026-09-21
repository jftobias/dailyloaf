"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { FinancialCard } from "@/components/financial/financial-card";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { getOverview, listAccounts, listTransactions, type Account, type FinancialTransaction, type Overview } from "@/lib/api-client";
import { displayTransactionAmount, formatMoney, monthRange } from "@/lib/financial-format"

export default function FinancialOverviewPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const [scope, setScope] = useState<Overview["scope"]>("combined");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    const range = monthRange(selected.time_zone);
    Promise.all([getOverview(selected.id, scope, range.from, range.to), listAccounts(selected.id), listTransactions(selected.id)])
      .then(([overviewResponse, accountsResponse, transactionsResponse]) => {
        setError("");
        setOverview(overviewResponse?.overview ?? null);
        setAccounts(accountsResponse?.accounts ?? []);
        setTransactions(transactionsResponse?.transactions ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && "status" in requestError && requestError.status === 401) router.replace("/login");
        setError(requestError instanceof Error ? requestError.message : "Financial data could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [router, scope, selected]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  if (auth.status === "error" || !auth.user) return <AuthLoading />;

  return <FinancialShell title="Overview">
    {error ? <FinancialError message={error} /> : loading ? <FinancialLoading /> : overview && selected ? <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#5d716b]">{overview.from} to {overview.to}</p><label className="text-sm font-semibold">View scope<select aria-label="Overview scope" value={scope} onChange={(event) => setScope(event.target.value as Overview["scope"])} className="ml-2 rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-3 py-2 font-normal focus:border-[#0f4c4c] focus:outline-none"><option value="shared">Shared</option>{auth.user.households.some((household) => household.id === selected.id) && <><option value="private">Private</option><option value="combined">Combined</option></>}</select></label></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><FinancialCard label="Net worth" value={formatMoney(overview.net_worth, selected.currency_code)} /><FinancialCard label="Total assets" value={formatMoney(overview.total_assets, selected.currency_code)} /><FinancialCard label="Total liabilities" value={formatMoney(overview.total_liabilities, selected.currency_code)} /><FinancialCard label="Net cash flow" value={formatMoney(overview.cash_flow, selected.currency_code)} /></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><FinancialCard label="Income" value={formatMoney(overview.income, selected.currency_code)} /><FinancialCard label="Expenses" value={formatMoney(overview.expenses, selected.currency_code)} /></div>
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Accounts</h2><Link href="/app/accounts/new" className="rounded-xl bg-[#0f4c4c] px-4 py-2 text-sm font-semibold text-[#fffdf8] focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">Add account</Link></div>{accounts.length === 0 ? <div className="rounded-2xl border border-dashed border-[#b9c9c0] bg-[#fffdf8] p-8"><p className="font-semibold">Start with your first account</p><p className="mt-2 text-sm text-[#5d716b]">Add checking, savings, cash, or a liability account to make your overview useful.</p></div> : <div className="grid gap-3 sm:grid-cols-2">{accounts.map((account) => <Link key={account.id} href={`/app/accounts/${account.id}`} className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]"><div className="flex justify-between gap-3"><div><p className="font-semibold">{account.name}</p><p className="mt-1 text-xs capitalize text-[#789089]">{account.account_type.replaceAll("_", " ")} · {account.visibility}</p></div><p className="font-semibold">{formatMoney(account.posted_balance, account.currency_code)}</p></div><p className="mt-3 text-xs text-[#5d716b]">Pending {formatMoney(account.pending_impact, account.currency_code)} · Projected {formatMoney(account.projected_balance, account.currency_code)}</p></Link>)}</div>}</section>
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent transactions</h2><Link href="/app/transactions" className="text-sm font-semibold text-[#0f4c4c] underline underline-offset-4">View all</Link></div>{transactions.length === 0 ? <div className="rounded-2xl border border-dashed border-[#b9c9c0] bg-[#fffdf8] p-8"><p className="font-semibold">No transactions yet</p><p className="mt-2 text-sm text-[#5d716b]">Record income or an expense after adding an account.</p></div> : <div className="divide-y divide-[#e3d9c9] rounded-2xl border border-[#d9cdb9] bg-[#fffdf8]">{transactions.slice(0, 8).map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium">{transaction.description}</p><p className="mt-1 text-xs text-[#789089]">{transaction.occurred_on} · {transaction.status}</p></div><p className="font-semibold">{displayTransactionAmount(transaction.kind, transaction.account_impact)} {selected.currency_code}</p></div>)}</div>}</section>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/app/transactions/new" className="rounded-xl border border-[#b9c9c0] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#0f4c4c]">Record income or expense</Link><Link href="/app/transfers/new" className="rounded-xl border border-[#b9c9c0] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#0f4c4c]">Transfer money</Link></div>
    </> : <FinancialLoading />}
  </FinancialShell>;
}
