"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FormField } from "@/components/form-field";
import { createAccount } from "@/lib/api-client";

const types = ["cash", "checking", "savings", "credit_card", "loan", "investment", "other_asset", "other_liability"] as const;

export default function NewAccountPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("checking");
  const [openingBalance, setOpeningBalance] = useState("0.0000");
  const [visibility, setVisibility] = useState<"shared" | "private">("shared");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !name.trim()) return setError("Enter an account name.");
    setSaving(true); setError("");
    try { await createAccount(selected.id, { name: name.trim(), account_type: type, opening_balance: openingBalance, opening_balance_date: new Date().toISOString().slice(0, 10), visibility }, crypto.randomUUID()); router.push("/app/accounts"); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Account could not be created."); }
    finally { setSaving(false); }
  }

  return <FinancialShell title="Add account"><form onSubmit={submit} className="max-w-xl space-y-5 rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6"><FinancialError message={error} /><FormField id="account-name" label="Account name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" placeholder="Main checking" /><div><label htmlFor="account-type" className="block text-sm font-semibold">Account type</label><select id="account-type" value={type} onChange={(event) => setType(event.target.value as (typeof types)[number])} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3 focus:border-[#0f4c4c] focus:outline-none">{types.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></div><FormField id="opening-balance" label="Opening balance" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} /><div><label htmlFor="visibility" className="block text-sm font-semibold">Visibility</label><select id="visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "shared" | "private")} className="mt-2 w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3 focus:border-[#0f4c4c] focus:outline-none"><option value="shared">Shared with household</option><option value="private">Private to me</option></select></div><button disabled={saving} className="rounded-xl bg-[#0f4c4c] px-5 py-3 font-semibold text-[#fffdf8] disabled:opacity-60">{saving ? "Saving…" : "Create account"}</button></form></FinancialShell>;
}
