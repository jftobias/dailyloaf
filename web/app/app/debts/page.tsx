"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { listDebts, type Debt } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { accountTypeLabel } from "@/lib/i18n/presentation";

export default function DebtsPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const t = useT();
  const fmt = useFormatters();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    listDebts(selected.id)
      .then((response) => setDebts(response?.debts ?? []))
      .catch((requestError) => setError(apiErrorMessage(requestError, t)))
      .finally(() => setLoading(false));
  }, [selected, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const currency = debts[0]?.currency_code ?? "COP";

  return (
    <FinancialShell title={t("debts.title")}>
      <div className="mb-5 flex justify-end">
        <Link href="/app/accounts/new"><Button variant="secondary" size="sm">{t("debts.addAccount")}</Button></Link>
      </div>
      <Alert message={error} className="mb-5" />
      {!loading && debts.length === 0 && !error && (
        <EmptyState title={t("debts.emptyTitle")} body={t("debts.emptyBody")} />
      )}
      <div className="grid gap-4">
        {debts.map((debt) => (
          <Link key={debt.account_id} href={`/app/debts/${debt.account_id}`} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">
            <Panel className="transition hover:border-[#b9c9c0]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{debt.name}</h2>
                    <StatusBadge tone={debt.visibility === "private" ? "neutral" : "active"}>
                      {debt.visibility === "private" ? t("debts.privateBadge") : t("debts.sharedBadge")}
                    </StatusBadge>
                    {debt.archived_at && <StatusBadge tone="muted">{t("debts.archivedBadge")}</StatusBadge>}
                  </div>
                  <p className="mt-1 text-sm text-[#5d716b]">
                    {debt.profile?.creditor_name ?? accountTypeLabel(debt.account_type, t)}
                    {debt.profile?.payment_due_day ? ` · ${t("debts.dueDay")} ${debt.profile.payment_due_day}` : ""}
                  </p>
                </div>
                <p className="text-xl font-semibold text-[#8c3028]">{fmt.money(debt.debt_balance, currency)}</p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[#5d716b]">{t("debts.interestRate")}</dt>
                  <dd className="font-semibold">{debt.profile ? t("debts.percentApr", { rate: debt.profile.annual_interest_rate }) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#5d716b]">{t("debts.minimumPayment")}</dt>
                  <dd className="font-semibold">{debt.profile ? fmt.money(debt.profile.minimum_payment, currency) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#5d716b]">{t("debts.plannedPayment")}</dt>
                  <dd className="font-semibold">{debt.profile?.planned_monthly_payment ? fmt.money(debt.profile.planned_monthly_payment, currency) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-[#5d716b]">{t("debts.estimatedPayoffDate")}</dt>
                  <dd className="font-semibold">{debt.estimated_payoff_date ? fmt.date(debt.estimated_payoff_date) : "—"}</dd>
                </div>
              </dl>
              {debt.paid_off_ratio !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#5d716b]">{t("debts.progressLabel")}</span>
                    <span className="font-semibold">{Math.round(Number(debt.paid_off_ratio) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee7da]" role="progressbar" aria-valuenow={Math.round(Number(debt.paid_off_ratio) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("debts.progressLabel")}>
                    <div className="h-full rounded-full bg-[#0f4c4c]" style={{ width: `${Math.round(Number(debt.paid_off_ratio) * 100)}%` }} />
                  </div>
                </div>
              )}
              {debt.pending_impact !== "0.0" && (
                <p className="mt-3 text-sm text-[#5d716b]">{t("accounts.pendingProjected", { pending: fmt.money(debt.pending_impact, currency), projected: fmt.money(debt.projected_debt_balance, currency) })}</p>
              )}
            </Panel>
          </Link>
        ))}
      </div>
    </FinancialShell>
  );
}
