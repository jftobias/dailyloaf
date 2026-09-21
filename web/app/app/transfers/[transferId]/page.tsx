"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { getTransfer, listAccounts, reverseTransfer, updateTransfer, type Account, type Transfer } from "@/lib/api-client";
import { formatMoney } from "@/lib/financial-format";

export default function TransferDetailPage() {
  const auth = useRequireAuth(); const { selected } = useSelectedHousehold(); const params = useParams<{ transferId: string }>();
  const [transfer, setTransfer] = useState<Transfer | null>(null); const [accounts, setAccounts] = useState<Account[]>([]); const [amount, setAmount] = useState(""); const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false); const [working, setWorking] = useState(false);
  const load = () => { if (!selected || !params.transferId) return; Promise.all([getTransfer(selected.id, Number(params.transferId)), listAccounts(selected.id)]).then(([transferResponse, accountsResponse]) => { const next = transferResponse?.transfer ?? null; setTransfer(next); setAmount(next?.amount ?? ""); setAccounts(accountsResponse?.accounts ?? []); }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Transfer could not be loaded.")); };
  useEffect(load, [params.transferId, selected]);
  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  async function reverse() { if (!selected || !transfer) return; setWorking(true); try { await reverseTransfer(selected.id, transfer.id); setConfirming(false); load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Transfer could not be reversed."); } finally { setWorking(false); } }
  async function savePending(event: FormEvent) { event.preventDefault(); if (!selected || !transfer) return; setWorking(true); try { await updateTransfer(selected.id, transfer.id, { source_account_id: transfer.source_account_id, destination_account_id: transfer.destination_account_id, amount }); load(); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Transfer could not be updated."); } finally { setWorking(false); } }
  if (error && !transfer) return <FinancialShell title="Transfer"><FinancialError message={error} /></FinancialShell>;
  const source = accounts.find((account) => account.id === transfer?.source_account_id)?.name ?? "Source account";
  const destination = accounts.find((account) => account.id === transfer?.destination_account_id)?.name ?? "Destination account";
  return <FinancialShell title="Transfer detail">{!transfer ? <FinancialLoading /> : <div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6"><p className="text-sm uppercase tracking-[0.2em] text-[#b0802f]">{transfer.status}</p><h2 className="mt-2 text-2xl font-semibold">{source} → {destination}</h2><p className="mt-2 text-3xl font-semibold">{formatMoney(transfer.amount, transfer.currency_code)}</p><p className="mt-3 text-sm text-[#5d716b]">One transfer aggregate with {transfer.transaction_ids.length} linked account effects.</p>{transfer.status === "pending" && <form onSubmit={savePending} className="mt-6 flex gap-3"><label className="flex-1 text-sm font-semibold">Amount<input aria-label="Transfer amount" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cdbfa9] p-3" /></label><button disabled={working} className="self-end rounded-xl bg-[#0f4c4c] px-4 py-3 font-semibold text-white">Save</button></form>}<div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={Boolean(transfer.reversal_of_id) || transfer.status !== "posted"} onClick={() => setConfirming(true)} className="rounded-xl border border-[#d99a91] px-4 py-3 font-semibold text-[#8c3028] disabled:opacity-50">{transfer.reversal_of_id ? "Already reversed" : "Reverse transfer"}</button></div>{error && <div className="mt-5"><FinancialError message={error} /></div>}{confirming && <ConfirmDialog title="Reverse this transfer?" description="Both account effects will be reversed atomically. Individual transfer legs will not be edited." confirmLabel="Reverse transfer" onConfirm={reverse} onCancel={() => setConfirming(false)} busy={working} />}</div>}</FinancialShell>;
}
