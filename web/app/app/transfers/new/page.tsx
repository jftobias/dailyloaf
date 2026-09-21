"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { createTransfer, listAccounts, type Account } from "@/lib/api-client";
import { compatibleTransferAccounts } from "@/lib/financial-rules";
import { apiErrorMessage } from "@/lib/form-errors";

export default function NewTransferPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const t = useT();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) return;
    listAccounts(selected.id)
      .then((response) => setAccounts((response?.accounts ?? []).filter((account) => !account.archived_at)))
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  }, [selected, t]);

  const compatible = compatibleTransferAccounts(accounts, Number(source));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !source || !destination || source === destination || !amount) {
      setError(t("transfers.chooseAccounts"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createTransfer(selected.id, { source_account_id: Number(source), destination_account_id: Number(destination), amount, status: "posted" }, crypto.randomUUID());
      router.push("/app");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  return (
    <FinancialShell title={t("transfers.newTitle")}>
      <Panel className="max-w-xl" padded={false}>
        <form onSubmit={submit} className="space-y-5 p-6">
          <Alert message={error} />
          <SelectField id="source" label={t("transfers.fromAccount")} value={source} onChange={(event) => { setSource(event.target.value); setDestination(""); }}>
            <option value="">{t("transfers.selectSource")}</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </SelectField>
          <SelectField id="destination" label={t("transfers.toAccount")} value={destination} onChange={(event) => setDestination(event.target.value)}>
            <option value="">{t("transfers.selectDestination")}</option>
            {compatible.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </SelectField>
          <FormField id="transfer-amount" label={t("transfers.amount")} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.0000" />
          <Button type="submit" size="lg" loading={saving} loadingLabel={t("transfers.submitting")}>
            {t("transfers.submit")}
          </Button>
        </form>
      </Panel>
    </FinancialShell>
  );
}
