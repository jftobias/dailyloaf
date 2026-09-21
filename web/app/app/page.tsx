"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { FinancialCard } from "@/components/financial/financial-card";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { getOverview, listAccounts, listTransactions, type Account, type FinancialTransaction, type Overview } from "@/lib/api-client";
import { displayTransactionAmount, monthRange } from "@/lib/financial-format";
import { apiErrorMessage } from "@/lib/form-errors";
import { accountTypeLabel, statusLabel, visibilityLabel } from "@/lib/i18n/presentation";

export default function FinancialOverviewPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const router = useRouter();
  const t = useT();
  const fmt = useFormatters();
  const [scope, setScope] = useState<Overview["scope"]>("combined");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    const range = monthRange(selected.time_zone);
    Promise.all([getOverview(selected.id, scope, range.from, range.to), listAccounts(selected.id), listTransactions(selected.id)])
      .then(([overviewResponse, accountsResponse, transactionsResponse]) => {
        setError("");
        setOverview(overviewResponse?.overview ?? null);
        setAccounts(accountsResponse?.accounts ?? []);
        setTransactions(transactionsResponse?.transactions ?? []);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && "status" in requestError && requestError.status === 401) router.replace("/login");
        setError(apiErrorMessage(requestError, t));
      })
      .finally(() => setLoading(false));
  }, [router, scope, selected, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;
  if (auth.status === "error" || !auth.user) return <AuthLoading />;
  const user = auth.user;

  const renderBody = () => {
    if (error) return <Alert message={error} />;
    if (loading || !overview || !selected) return <FinancialLoading />;

    return (
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5d716b]">{t("overview.range", { from: fmt.date(overview.from, selected.time_zone), to: fmt.date(overview.to, selected.time_zone) })}</p>
          <SelectField id="overview-scope" label={t("scope.label")} aria-label={t("scope.aria")} value={scope} onChange={(event) => setScope(event.target.value as Overview["scope"])} className="w-auto">
            <option value="shared">{t("scope.shared")}</option>
            {user.households.some((household) => household.id === selected.id) && (
              <>
                <option value="private">{t("scope.private")}</option>
                <option value="combined">{t("scope.combined")}</option>
              </>
            )}
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FinancialCard label={t("overview.netWorth")} value={fmt.money(overview.net_worth, selected.currency_code)} />
          <FinancialCard label={t("overview.totalAssets")} value={fmt.money(overview.total_assets, selected.currency_code)} />
          <FinancialCard label={t("overview.totalLiabilities")} value={fmt.money(overview.total_liabilities, selected.currency_code)} />
          <FinancialCard label={t("overview.netCashFlow")} value={fmt.money(overview.cash_flow, selected.currency_code)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FinancialCard label={t("overview.income")} value={fmt.money(overview.income, selected.currency_code)} />
          <FinancialCard label={t("overview.expenses")} value={fmt.money(overview.expenses, selected.currency_code)} />
        </div>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("overview.accountsHeading")}</h2>
            <Link href="/app/accounts/new" className={buttonClasses({ size: "sm" })}>{t("overview.addAccount")}</Link>
          </div>
          {accounts.length === 0 ? (
            <EmptyState title={t("overview.accountsEmptyTitle")} body={t("overview.accountsEmptyBody")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <Link key={account.id} href={`/app/accounts/${account.id}`} className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="mt-1 text-xs text-[#789089]">{accountTypeLabel(account.account_type, t)} · {visibilityLabel(account.visibility, t)}</p>
                    </div>
                    <p className="font-semibold">{fmt.money(account.posted_balance, account.currency_code)}</p>
                  </div>
                  <p className="mt-3 text-xs text-[#5d716b]">
                    {t("overview.pendingProjected", { pending: fmt.money(account.pending_impact, account.currency_code), projected: fmt.money(account.projected_balance, account.currency_code) })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("overview.recentTransactions")}</h2>
            <Link href="/app/transactions" className="text-sm font-semibold text-[#0f4c4c] underline underline-offset-4">{t("common.viewAll")}</Link>
          </div>
          {transactions.length === 0 ? (
            <EmptyState title={t("overview.transactionsEmptyTitle")} body={t("overview.transactionsEmptyBody")} />
          ) : (
            <Panel padded={false} className="divide-y divide-[#e3d9c9]">
              {transactions.slice(0, 8).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="mt-1 text-xs text-[#789089]">{fmt.date(transaction.occurred_on, selected.time_zone)} · {statusLabel(transaction.status, t)}</p>
                  </div>
                  <p className="font-semibold">{fmt.money(displayTransactionAmount(transaction.kind, transaction.account_impact), selected.currency_code)}</p>
                </div>
              ))}
            </Panel>
          )}
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app/transactions/new" className={buttonClasses({ variant: "secondary" })}>{t("overview.recordIncomeOrExpense")}</Link>
          <Link href="/app/transfers/new" className={buttonClasses({ variant: "secondary" })}>{t("overview.transferMoney")}</Link>
        </div>
      </>
    );
  };

  return <FinancialShell title={t("overview.title")}>{renderBody()}</FinancialShell>;
}
