"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FormField } from "@/components/form-field";
import { createTransfer, listAccounts, type Account } from "@/lib/api-client";
import { compatibleTransferAccounts } from "@/lib/financial-rules";

export default function NewTransferPage() {
  const auth = useRequireAuth(); const { selected } = useSelectedHousehold(); const router = useRouter(); const [accounts, setAccounts] = useState<Account[]>([]); const [source, setSource] = useState(""); const [destination, setDestination] = useState(""); const [amount, setAmount] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!selected) return; listAccounts(selected.id).then((response) => setAccounts((response?.accounts ?? []).filter((account) => !account.archived_at))).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Accounts could not be loaded.")); }, [selected]);
  const compatible = compatibleTransferAccounts(accounts, Number(source));
  async function submit(event: FormEvent) { event.preventDefault(); if (!selected || !source || !destination || source === destination || !amount) return setError("Choose two compatible accounts and enter an amount."); setSaving(true); setError(""); try { await createTransfer(selected.id, { source_account_id: Number(source), destination_account_id: Number(destination), amount, status: "posted" }, crypto.randomUUID()); router.push("/app"); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Transfer could not be saved."); } finally { setSaving(false); } }
  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  return <FinancialShell title="Transfer money"><form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6"><FinancialError message={error} /><div><label htmlFor="source" className="block text-sm font-semibold">From account</label><select id="source" value={source} onChange={(event) => { setSource(event.target.value); setDestination(""); }} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3"><option value="">Select source</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div><div><label htmlFor="destination" className="block text-sm font-semibold">To account</label><select id="destination" value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3"><option value="">Select destination</option>{compatible.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div><FormField id="transfer-amount" label="Amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.0000" /><button disabled={saving} className="rounded-xl bg-[#0f4c4c] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? "Transferring…" : "Transfer money"}</button></form></FinancialShell>;
}
