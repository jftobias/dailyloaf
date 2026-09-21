"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { createAccount, type Account } from "@/lib/api-client";
import { todayInTimeZone } from "@/lib/financial-format";
import { apiErrorMessage } from "@/lib/form-errors";

const ACCOUNT_TYPES: Account["account_type"][] = ["cash", "checking", "savings", "credit_card", "loan", "investment", "other_asset", "other_liability"];

export default function NewAccountPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const t = useT();
  const [name, setName] = useState("");
  const [type, setType] = useState<Account["account_type"]>("checking");
  const [openingBalance, setOpeningBalance] = useState("0.0000");
  const [visibility, setVisibility] = useState<"shared" | "private">("shared");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !name.trim()) {
      setError(t("accounts.enterName"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createAccount(selected.id, { name: name.trim(), account_type: type, opening_balance: openingBalance, opening_balance_date: todayInTimeZone(selected.time_zone), visibility }, crypto.randomUUID());
      router.push("/app/accounts");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FinancialShell title={t("accounts.createTitle")}>
      <Panel className="max-w-xl" padded={false}>
        <form onSubmit={submit} className="space-y-5 p-6">
          <Alert message={error} />
          <FormField id="account-name" label={t("accounts.accountName")} value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" placeholder={t("accounts.accountNamePlaceholder")} />
          <SelectField id="account-type" label={t("accounts.accountType")} value={type} onChange={(event) => setType(event.target.value as Account["account_type"])}>
            {ACCOUNT_TYPES.map((value) => <option key={value} value={value}>{t(`accountTypes.${value}`)}</option>)}
          </SelectField>
          <FormField id="opening-balance" label={t("accounts.openingBalance")} inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} />
          <SelectField id="visibility" label={t("accounts.visibilityLabel")} value={visibility} onChange={(event) => setVisibility(event.target.value as "shared" | "private")}>
            <option value="shared">{t("visibility.sharedWithHousehold")}</option>
            <option value="private">{t("visibility.privateToMe")}</option>
          </SelectField>
          <Button type="submit" size="lg" loading={saving} loadingLabel={t("common.saving")}>
            {t("accounts.create")}
          </Button>
        </form>
      </Panel>
    </FinancialShell>
  );
}
