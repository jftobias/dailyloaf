"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useI18n, useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormField } from "@/components/form-field";
import { MoneyField } from "@/components/money-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  archiveAccount,
  createDebtProfile,
  createTransfer,
  deleteDebtProfile,
  getDebt,
  getDebtProjection,
  listAccounts,
  updateAccount,
  updateDebtProfile,
  type Account,
  type Debt,
  type DebtProjection,
} from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { accountTypeLabel } from "@/lib/i18n/presentation";
import { canonicalizeMoneyInput } from "@/lib/money-input";

type ProfileForm = {
  creditor_name: string;
  annual_interest_rate: string;
  minimum_payment: string;
  planned_monthly_payment: string;
  payment_due_day: string;
  original_principal: string;
  opened_on: string;
  maturity_on: string;
  notes: string;
};

const EMPTY_FORM: ProfileForm = {
  creditor_name: "",
  annual_interest_rate: "0",
  minimum_payment: "",
  planned_monthly_payment: "",
  payment_due_day: "",
  original_principal: "",
  opened_on: "",
  maturity_on: "",
  notes: "",
};

function formFrom(debt: Debt | null): ProfileForm {
  const profile = debt?.profile;
  if (!profile) return EMPTY_FORM;
  return {
    creditor_name: profile.creditor_name ?? "",
    annual_interest_rate: profile.annual_interest_rate,
    minimum_payment: profile.minimum_payment,
    planned_monthly_payment: profile.planned_monthly_payment ?? "",
    payment_due_day: profile.payment_due_day?.toString() ?? "",
    original_principal: profile.original_principal ?? "",
    opened_on: profile.opened_on ?? "",
    maturity_on: profile.maturity_on ?? "",
    notes: profile.notes ?? "",
  };
}

function isZero(canonical: string) {
  return /^0+(\.0+)?$/.test(canonical);
}

export default function DebtDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ accountId: string }>();
  const t = useT();
  const fmt = useFormatters();
  const { intlLocale } = useI18n();
  const accountId = Number(params.accountId);

  const [debt, setDebt] = useState<Debt | null>(null);
  const [projection, setProjection] = useState<DebtProjection | null>(null);
  const [assetAccounts, setAssetAccounts] = useState<Account[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoName, setInfoName] = useState("");
  const [infoLimit, setInfoLimit] = useState("");
  const [infoError, setInfoError] = useState("");
  const [paySource, setPaySource] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payError, setPayError] = useState("");
  const [payNotice, setPayNotice] = useState("");
  const [paying, setPaying] = useState(false);

  function refresh(householdId: number) {
    getDebt(householdId, accountId)
      .then((response) => {
        const next = response?.debt ?? null;
        setDebt(next);
        setForm((current) => (editing ? current : formFrom(next)));
        if (next?.profile) {
          getDebtProjection(householdId, accountId).then((projectionResponse) => setProjection(projectionResponse?.projection ?? null)).catch(() => setProjection(null));
        } else {
          setProjection(null);
        }
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  }

  useEffect(() => {
    if (!selected) return;
    refresh(selected.id);
    listAccounts(selected.id)
      .then((response) => setAssetAccounts((response?.accounts ?? []).filter((account) => !account.archived_at && ["cash", "checking", "savings", "investment", "other_asset"].includes(account.account_type))))
      .catch(() => setAssetAccounts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, accountId, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const currency = debt?.currency_code ?? selected?.currency_code ?? "COP";
  const isCard = debt?.account_type === "credit_card";

  function moneyValue(value: string) {
    return canonicalizeMoneyInput(value, intlLocale);
  }

  function validateProfile(): boolean {
    const errors: Record<string, string> = {};
    const minimum = moneyValue(form.minimum_payment);
    if (minimum === null || minimum.startsWith("-")) errors.minimum_payment = t("debts.minimumPaymentRequired");
    const rate = moneyValue(form.annual_interest_rate);
    if (rate === null || rate.startsWith("-")) errors.annual_interest_rate = t("debts.invalidRate");
    const planned = moneyValue(form.planned_monthly_payment);
    if (form.planned_monthly_payment.trim() && (planned === null || planned.startsWith("-"))) errors.planned_monthly_payment = t("debts.invalidPayment");
    if (form.payment_due_day) {
      const day = Number(form.payment_due_day);
      if (!Number.isInteger(day) || day < 1 || day > 31) errors.payment_due_day = t("debts.invalidDueDay");
    }
    const principal = moneyValue(form.original_principal);
    if (form.original_principal.trim() && (principal === null || principal.startsWith("-") || isZero(principal))) errors.original_principal = t("debts.invalidPrincipal");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!selected || !validateProfile()) return;
    setSaving(true);
    setError("");
    const input: Record<string, unknown> = {
      creditor_name: form.creditor_name || null,
      annual_interest_rate: moneyValue(form.annual_interest_rate),
      minimum_payment: moneyValue(form.minimum_payment),
      planned_monthly_payment: form.planned_monthly_payment.trim() ? moneyValue(form.planned_monthly_payment) : null,
      payment_due_day: form.payment_due_day || null,
      original_principal: form.original_principal.trim() ? moneyValue(form.original_principal) : null,
      opened_on: form.opened_on || null,
      maturity_on: form.maturity_on || null,
      notes: form.notes || null,
    };
    try {
      if (debt?.profile) {
        await updateDebtProfile(selected.id, accountId, input);
      } else {
        await createDebtProfile(selected.id, accountId, input);
      }
      setEditing(false);
      refresh(selected.id);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile() {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDebtProfile(selected.id, accountId);
      setConfirmRemove(false);
      setEditing(false);
      refresh(selected.id);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  function startEditInfo() {
    setInfoName(debt?.name ?? "");
    setInfoLimit(debt?.credit_limit ?? "");
    setInfoError("");
    setEditingInfo(true);
  }

  async function saveInfo(event: FormEvent) {
    event.preventDefault();
    if (!selected || !debt || !infoName.trim()) return;
    const limit = infoLimit.trim() ? moneyValue(infoLimit) : null;
    if (isCard && infoLimit.trim() && (limit === null || limit.startsWith("-") || isZero(limit))) {
      setInfoError(t("accounts.invalidCreditLimit"));
      return;
    }
    setSaving(true);
    setInfoError("");
    try {
      await updateAccount(selected.id, accountId, { name: infoName.trim(), ...(isCard ? { credit_limit: limit } : {}) });
      setEditingInfo(false);
      refresh(selected.id);
    } catch (requestError) {
      setInfoError(apiErrorMessage(requestError, t));
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!selected) return;
    setArchiving(true);
    try {
      await archiveAccount(selected.id, accountId);
      setConfirmArchive(false);
      refresh(selected.id);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t) || t("debts.archiveError"));
    } finally {
      setArchiving(false);
    }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    setPayNotice("");
    const amount = moneyValue(payAmount);
    if (!selected || !paySource || amount === null || amount.startsWith("-") || isZero(amount)) {
      setPayError(t("debts.invalidPayAmount"));
      return;
    }
    setPaying(true);
    setPayError("");
    try {
      await createTransfer(selected.id, { source_account_id: Number(paySource), destination_account_id: accountId, amount, status: "posted" }, crypto.randomUUID());
      setPayAmount("");
      setPayNotice(t("debts.paySuccess"));
      refresh(selected.id);
    } catch (requestError) {
      setPayError(apiErrorMessage(requestError, t));
    } finally {
      setPaying(false);
    }
  }

  const paidOffPercent = debt?.paid_off_ratio !== null && debt?.paid_off_ratio !== undefined ? Math.round(Number(debt.paid_off_ratio) * 100) : null;
  const utilization = debt?.utilization_percentage !== null && debt?.utilization_percentage !== undefined ? Number(debt.utilization_percentage) : null;
  const overLimit = debt?.over_limit_amount && !isZero(debt.over_limit_amount) ? debt.over_limit_amount : null;
  const utilizationLabel = utilization === null ? null : new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 }).format(utilization);

  return (
    <FinancialShell title={debt?.name ?? t("debts.fallbackTitle")}>
      <Alert message={error} className="mb-5" />
      {debt && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={debt.visibility === "private" ? "neutral" : "active"}>
                  {debt.visibility === "private" ? t("debts.privateBadge") : t("debts.sharedBadge")}
                </StatusBadge>
                {debt.archived_at && <StatusBadge tone="muted">{t("debts.archivedBadge")}</StatusBadge>}
                <span className="text-sm text-[#5d716b]">{accountTypeLabel(debt.account_type, t)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[#5d716b]">{t("debts.debtBalance")}</dt>
                  <dd className="text-xl font-semibold text-[#8c3028]">{fmt.money(debt.debt_balance, currency)}</dd>
                </div>
                <div>
                  <dt className="text-[#5d716b]">{t("debts.projectedBalance")}</dt>
                  <dd className="text-xl font-semibold">{fmt.money(debt.projected_debt_balance, currency)}</dd>
                </div>
              </dl>
              {paidOffPercent !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5d716b]">{t("debts.progressLabel")}</span>
                    <span className="font-semibold">{t("debts.progressOf", { percent: `${paidOffPercent}%` })}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee7da]" role="progressbar" aria-valuenow={paidOffPercent} aria-valuemin={0} aria-valuemax={100} aria-label={t("debts.progressLabel")}>
                    <div className="h-full rounded-full bg-[#0f4c4c]" style={{ width: `${paidOffPercent}%` }} />
                  </div>
                </div>
              )}
              {!debt.archived_at && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {!editingInfo && (
                    <Button type="button" variant="secondary" size="sm" onClick={startEditInfo}>
                      {isCard ? t("debts.editCard") : t("debts.editAccountInfo")}
                    </Button>
                  )}
                  <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmArchive(true)}>
                    {isCard ? t("debts.archiveCard") : t("debts.archiveAccount")}
                  </Button>
                </div>
              )}
              {editingInfo && (
                <form onSubmit={saveInfo} className="mt-5 space-y-4 rounded-xl bg-[#edf4ef] p-4">
                  <Alert message={infoError} />
                  <FormField id="card-name" label={isCard ? t("debts.cardName") : t("accounts.accountName")} value={infoName} onChange={(event) => setInfoName(event.target.value)} autoComplete="off" />
                  {isCard && (
                    <MoneyField id="card-limit" label={t("debts.creditLimit")} hint={t("accounts.creditLimitHint")} value={infoLimit} onChange={setInfoLimit} currency={currency} />
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" size="sm" loading={saving} loadingLabel={t("common.saving")}>{t("common.save")}</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInfo(false)}>{t("common.cancel")}</Button>
                  </div>
                </form>
              )}
            </Panel>

            {isCard && (
              <Panel>
                <h2 className="text-lg font-semibold">{t("debts.availabilityTitle")}</h2>
                <p className="mt-1 text-xs text-[#5d716b]">{t("debts.estimatedNote")}</p>
                {debt.credit_limit === null ? (
                  <p className="mt-3 text-sm text-[#5d716b]">{t("accounts.creditLimitHint")}</p>
                ) : (
                  <>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-[#5d716b]">{t("debts.creditLimit")}</dt><dd className="font-semibold">{fmt.money(debt.credit_limit, currency)}</dd></div>
                      <div><dt className="text-[#5d716b]">{t("debts.currentBalance")}</dt><dd className="font-semibold">{fmt.money(debt.projected_debt_balance, currency)}</dd></div>
                      <div><dt className="text-[#5d716b]">{t("debts.availableCredit")}</dt><dd className={`font-semibold ${overLimit ? "text-[#8c3028]" : ""}`}>{fmt.money(debt.available_credit ?? "0", currency)}</dd></div>
                      <div><dt className="text-[#5d716b]">{t("debts.utilization")}</dt><dd className="font-semibold">{utilizationLabel !== null ? `${utilizationLabel}%` : "—"}</dd></div>
                    </dl>
                    {utilization !== null && (
                      <div className="mt-4">
                        <div className="h-2 overflow-hidden rounded-full bg-[#eee7da]" role="progressbar" aria-label={t("debts.utilization")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(Math.round(utilization), 100)} aria-valuetext={`${utilizationLabel}%`}>
                          <div className={`h-full rounded-full ${overLimit ? "bg-[#8c3028]" : "bg-[#0f4c4c]"}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
                        </div>
                        {overLimit && <p className="mt-2 text-sm font-medium text-[#8c3028]">{t("debts.overLimit", { amount: fmt.money(overLimit, currency) })}</p>}
                      </div>
                    )}
                  </>
                )}
              </Panel>
            )}

            {!debt.archived_at && (
              <Panel>
                <h2 className="text-lg font-semibold">{t("debts.payTitle")}</h2>
                <p className="mt-1 text-sm text-[#5d716b]">{t("debts.payDescription")}</p>
                <form onSubmit={submitPayment} className="mt-4 space-y-4">
                  <Alert message={payError} />
                  {payNotice && <Alert variant="success" message={payNotice} />}
                  {assetAccounts.length === 0 ? (
                    <p className="text-sm text-[#5d716b]">{t("debts.noAssetAccounts")}</p>
                  ) : (
                    <>
                      <SelectField id="pay-source" label={t("debts.paySource")} value={paySource} onChange={(event) => setPaySource(event.target.value)}>
                        <option value="">{t("transfers.selectSource")}</option>
                        {assetAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </SelectField>
                      <MoneyField id="pay-amount" label={t("debts.payAmount")} value={payAmount} onChange={setPayAmount} currency={currency} />
                      <Button type="submit" loading={paying} loadingLabel={t("debts.paying")}>{t("debts.paySubmit")}</Button>
                    </>
                  )}
                </form>
              </Panel>
            )}
          </div>

          <div className="space-y-6">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{t("debts.estimateTitle")}</h2>
                {!editing && (
                  <Button variant="secondary" size="sm" onClick={() => { setForm(formFrom(debt)); setEditing(true); }}>
                    {debt.profile ? t("debts.editProfile") : t("debts.configureProfile")}
                  </Button>
                )}
              </div>
              {editing ? (
                <form onSubmit={saveProfile} className="mt-4 space-y-4">
                  <FormField id="creditor" label={t("debts.creditor")} value={form.creditor_name} onChange={(event) => setForm({ ...form, creditor_name: event.target.value })} placeholder={t("debts.creditorPlaceholder")} />
                  <FormField id="rate" label={t("debts.interestRate")} inputMode="decimal" value={form.annual_interest_rate} onChange={(event) => setForm({ ...form, annual_interest_rate: event.target.value })} error={fieldErrors.annual_interest_rate} placeholder="19.99" />
                  <MoneyField id="min-payment" label={t("debts.minimumPayment")} value={form.minimum_payment} onChange={(value) => setForm({ ...form, minimum_payment: value })} currency={currency} error={fieldErrors.minimum_payment} />
                  <MoneyField id="planned-payment" label={t("debts.plannedPayment")} value={form.planned_monthly_payment} onChange={(value) => setForm({ ...form, planned_monthly_payment: value })} currency={currency} error={fieldErrors.planned_monthly_payment} />
                  <FormField id="due-day" label={t("debts.dueDay")} inputMode="numeric" value={form.payment_due_day} onChange={(event) => setForm({ ...form, payment_due_day: event.target.value })} error={fieldErrors.payment_due_day} hint={t("debts.dueDayHint")} />
                  <MoneyField id="principal" label={t("debts.originalPrincipal")} value={form.original_principal} onChange={(value) => setForm({ ...form, original_principal: value })} currency={currency} error={fieldErrors.original_principal} />
                  <FormField id="opened" label={t("debts.openedOn")} type="date" value={form.opened_on} onChange={(event) => setForm({ ...form, opened_on: event.target.value })} />
                  <FormField id="maturity" label={t("debts.maturityOn")} type="date" value={form.maturity_on} onChange={(event) => setForm({ ...form, maturity_on: event.target.value })} />
                  <FormField id="notes" label={t("debts.notes")} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder={t("debts.notesPlaceholder")} />
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" loading={saving} loadingLabel={t("debts.savingProfile")}>{t("debts.saveProfile")}</Button>
                    <Button type="button" variant="ghost" onClick={() => { setEditing(false); setFieldErrors({}); setForm(formFrom(debt)); }}>{t("common.cancel")}</Button>
                    {debt.profile && <Button type="button" variant="destructive" onClick={() => setConfirmRemove(true)}>{t("debts.removeProfile")}</Button>}
                  </div>
                </form>
              ) : debt.profile ? (
                <>
                  <p className="mt-2 text-xs text-[#5d716b]">{t("debts.estimateDisclaimer")}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-[#5d716b]">{t("debts.interestRate")}</dt><dd className="font-semibold">{t("debts.percentApr", { rate: debt.profile.annual_interest_rate })}</dd></div>
                    <div><dt className="text-[#5d716b]">{t("debts.minimumPayment")}</dt><dd className="font-semibold">{fmt.money(debt.profile.minimum_payment, currency)}</dd></div>
                    <div><dt className="text-[#5d716b]">{t("debts.plannedPayment")}</dt><dd className="font-semibold">{debt.profile.planned_monthly_payment ? fmt.money(debt.profile.planned_monthly_payment, currency) : "—"}</dd></div>
                    <div><dt className="text-[#5d716b]">{t("debts.dueDay")}</dt><dd className="font-semibold">{debt.profile.payment_due_day ?? "—"}</dd></div>
                  </dl>
                  {projection && (
                    <div className="mt-4 rounded-xl bg-[#edf4ef] p-4">
                      <p className="text-sm font-semibold">{projection.amortizing ? (projection.months === 0 ? t("debts.paidOff") : t("debts.amortizingYes")) : t("debts.amortizingNo")}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-[#5d716b]">{t("debts.assumedPayment")}</dt><dd className="font-semibold">{fmt.money(projection.assumed_monthly_payment, currency)}</dd></div>
                        <div><dt className="text-[#5d716b]">{t("debts.estimatedPayoffDate")}</dt><dd className="font-semibold">{projection.payoff_date ? fmt.date(projection.payoff_date) : "—"}</dd></div>
                        <div><dt className="text-[#5d716b]">{t("debts.estimatedMonths")}</dt><dd className="font-semibold">{projection.months !== null ? t("debts.monthsUnit", { count: projection.months }) : "—"}</dd></div>
                        <div><dt className="text-[#5d716b]">{t("debts.totalEstimatedInterest")}</dt><dd className="font-semibold">{projection.total_interest ? fmt.money(projection.total_interest, currency) : "—"}</dd></div>
                        <div><dt className="text-[#5d716b]">{t("debts.totalEstimatedPaid")}</dt><dd className="font-semibold">{projection.total_paid ? fmt.money(projection.total_paid, currency) : "—"}</dd></div>
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-3">
                  <p className="font-semibold">{t("debts.noProfileTitle")}</p>
                  <p className="mt-1 text-sm text-[#5d716b]">{t("debts.noProfileBody")}</p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
      {confirmRemove && (
        <ConfirmDialog
          title={t("debts.removeTitle")}
          description={t("debts.removeDescription")}
          confirmLabel={t("debts.removeConfirm")}
          busy={saving}
          onConfirm={removeProfile}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
      {confirmArchive && (
        <ConfirmDialog
          title={isCard ? t("debts.archiveCardTitle") : t("debts.archiveAccountTitle")}
          description={isCard ? t("debts.archiveCardDescription") : t("debts.archiveAccountDescription")}
          confirmLabel={isCard ? t("debts.archiveCard") : t("debts.archiveAccount")}
          busy={archiving}
          onConfirm={archive}
          onCancel={() => setConfirmArchive(false)}
        />
      )}
    </FinancialShell>
  );
}
