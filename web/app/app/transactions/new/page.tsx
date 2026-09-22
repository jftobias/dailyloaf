"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useI18n, useT } from "@/components/locale-provider";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FormField } from "@/components/form-field";
import { MoneyField } from "@/components/money-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { createTransaction, listAccounts, listCategories, type Account, type Category } from "@/lib/api-client";
import { positiveAmountToImpact, todayInTimeZone } from "@/lib/financial-format";
import { availableCategories } from "@/lib/financial-rules";
import { apiErrorMessage } from "@/lib/form-errors";
import { categoryLabel } from "@/lib/i18n/presentation";
import { canonicalizeMoneyInput } from "@/lib/money-input";

export default function NewTransactionPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const t = useT();
  const { intlLocale } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [status, setStatus] = useState<"pending" | "posted">("posted");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) return;
    Promise.all([listAccounts(selected.id), listCategories(selected.id)])
      .then(([accountsResponse, categoriesResponse]) => {
        setAccounts((accountsResponse?.accounts ?? []).filter((account) => !account.archived_at));
        setCategories(categoriesResponse?.categories ?? []);
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  }, [selected, t]);

  const availableTransactionCategories = availableCategories(categories, kind, accounts.find((account) => account.id === Number(accountId)));
  const effectiveOccurredOn = occurredOn || (selected ? todayInTimeZone(selected.time_zone) : "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const canonicalAmount = canonicalizeMoneyInput(amount, intlLocale);
    if (!selected || !accountId || !categoryId || !description.trim()) {
      setError(t("transactions.requiredFields"));
      return;
    }
    if (canonicalAmount === null || canonicalAmount.startsWith("-")) {
      setError(t("money.invalidAmount"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createTransaction(selected.id, { account_id: Number(accountId), category_id: Number(categoryId), kind, account_impact: positiveAmountToImpact(kind, canonicalAmount), status, occurred_on: effectiveOccurredOn, description: description.trim(), notes }, crypto.randomUUID());
      router.push("/app");
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  return (
    <FinancialShell title={t("transactions.record")}>
      <Panel className="max-w-2xl" padded={false}>
        <form onSubmit={submit} className="space-y-5 p-6">
          <Alert message={error} />
          <div className="flex gap-2" role="group" aria-label={t("categories.kind")}>
            {(["income", "expense"] as const).map((value) => (
              <Button key={value} type="button" size="sm" variant={kind === value ? "primary" : "secondary"} onClick={() => setKind(value)}>
                {t(`kinds.${value}`)}
              </Button>
            ))}
          </div>
          <SelectField id="transaction-account" label={t("transactions.account")} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">{t("transactions.selectAccount")}</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </SelectField>
          <SelectField id="transaction-category" label={t("transactions.category")} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{t("transactions.selectCategory")}</option>
            {availableTransactionCategories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category, t)}</option>)}
          </SelectField>
          <MoneyField id="transaction-amount" label={t("transactions.amount")} value={amount} onChange={setAmount} currency={selected?.currency_code ?? "COP"} />
          <FormField id="transaction-description" label={t("transactions.description")} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("transactions.descriptionPlaceholder")} />
          <FormField id="transaction-notes" label={t("transactions.notes")} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("transactions.notesPlaceholder")} />
          <FormField id="transaction-date" label={t("transactions.date")} type="date" value={effectiveOccurredOn} onChange={(event) => setOccurredOn(event.target.value)} />
          <SelectField id="transaction-status" label={t("transactions.statusLabel")} value={status} onChange={(event) => setStatus(event.target.value as "pending" | "posted")}>
            <option value="posted">{t("status.posted")}</option>
            <option value="pending">{t("status.pending")}</option>
          </SelectField>
          <Button type="submit" size="lg" loading={saving} loadingLabel={t("common.saving")}>
            {t("transactions.save")}
          </Button>
        </form>
      </Panel>
    </FinancialShell>
  );
}
