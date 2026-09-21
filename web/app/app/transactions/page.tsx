"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { listTransactions, type FinancialTransaction } from "@/lib/api-client";

export default function TransactionsPage() {
  const auth = useRequireAuth(); const { selected } = useSelectedHousehold(); const [items, setItems] = useState<FinancialTransaction[]>([]); const [error, setError] = useState("");
  useEffect(() => { if (!selected) return; listTransactions(selected.id).then((response) => setItems(response?.transactions ?? [])).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Transactions could not be loaded.")); }, [selected]);
  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  return <FinancialShell title="Transactions">{error ? <FinancialError message={error} /> : !items ? <FinancialLoading /> : <><div className="mb-5 flex justify-end"><Link href="/app/transactions/new" className="rounded-xl bg-[#0f4c4c] px-4 py-3 text-sm font-semibold text-[#fffdf8]">Record income or expense</Link></div><div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8]">{items.length === 0 ? <p className="p-8 text-sm text-[#5d716b]">No transactions yet.</p> : items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 border-b border-[#e3d9c9] p-4 last:border-0"><div><p className="font-semibold">{item.description}</p><p className="mt-1 text-xs text-[#789089]">{item.kind} · {item.occurred_on} · {item.status}{item.reversal_of_id ? " · corrected" : ""}</p></div><span className="font-semibold">{item.account_impact}</span></div>)}</div></>}</FinancialShell>;
}
