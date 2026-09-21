"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { getAccount, listTransactions, type Account, type FinancialTransaction } from "@/lib/api-client";
import { formatMoney } from "@/lib/financial-format";

export default function AccountDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected || !params.accountId) return;
    Promise.all([getAccount(selected.id, Number(params.accountId)), listTransactions(selected.id)]).then(([accountResponse, transactionResponse]) => { setAccount(accountResponse?.account ?? null); setTransactions((transactionResponse?.transactions ?? []).filter((transaction) => transaction.account_id === Number(params.accountId))); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Account could not be loaded."));
  }, [params.accountId, selected]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  return <FinancialShell title={account?.name ?? "Account"}>{error ? <FinancialError message={error} /> : !account ? <FinancialLoading /> : <><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5"><p className="text-sm text-[#5d716b]">Posted</p><p className="mt-2 text-2xl font-semibold">{formatMoney(account.posted_balance, account.currency_code)}</p></div><div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5"><p className="text-sm text-[#5d716b]">Pending</p><p className="mt-2 text-2xl font-semibold">{formatMoney(account.pending_impact, account.currency_code)}</p></div><div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5"><p className="text-sm text-[#5d716b]">Projected</p><p className="mt-2 text-2xl font-semibold">{formatMoney(account.projected_balance, account.currency_code)}</p></div></div><div className="mt-8 rounded-2xl border border-[#d9cdb9] bg-[#fffdf8]">{transactions.length === 0 ? <p className="p-6 text-sm text-[#5d716b]">No activity in this account yet.</p> : transactions.map((transaction) => <div key={transaction.id} className="flex justify-between border-b border-[#e3d9c9] p-4 last:border-0"><span><b>{transaction.description}</b><small className="mt-1 block text-[#789089]">{transaction.occurred_on} · {transaction.status}</small></span><span className="font-semibold">{transaction.account_impact}</span></div>)}</div><Link href="/app/transactions/new" className="mt-6 inline-block rounded-xl bg-[#0f4c4c] px-4 py-3 text-sm font-semibold text-[#fffdf8]">Record activity</Link></>}</FinancialShell>;
}
