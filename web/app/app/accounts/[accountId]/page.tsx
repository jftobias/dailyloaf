"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveAccount, getAccount, listTransactions, type Account, type FinancialTransaction } from "@/lib/api-client";
import { displayTransactionAmount } from "@/lib/financial-format";
import { apiErrorMessage } from "@/lib/form-errors";
import { accountTypeLabel, statusLabel, visibilityLabel } from "@/lib/i18n/presentation";
import { controlClasses } from "@/components/ui/control-classes";

type StatusFilter = "all" | "pending" | "posted";

export default function AccountDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ accountId: string }>();
  const t = useT();
  const fmt = useFormatters();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const load = () => {
    if (!selected || !params.accountId) return;
    Promise.all([getAccount(selected.id, Number(params.accountId)), listTransactions(selected.id)])
      .then(([accountResponse, transactionResponse]) => {
        setAccount(accountResponse?.account ?? null);
        setTransactions((transactionResponse?.transactions ?? []).filter((transaction) => transaction.account_id === Number(params.accountId)));
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  };
  useEffect(load, [params.accountId, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTransactions = transactions.filter((transaction) => (statusFilter === "all" || transaction.status === statusFilter) && (!from || transaction.occurred_on >= from) && (!to || transaction.occurred_on <= to));

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  async function archive() {
    if (!selected || !account) return;
    setArchiving(true);
    try {
      await archiveAccount(selected.id, account.id);
      setConfirming(false);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setArchiving(false);
    }
  }

  const renderBody = () => {
    if (error && !account) return <Alert message={error} />;
    if (!account) return <FinancialLoading />;

    return (
      <>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <StatusBadge>
            {accountTypeLabel(account.account_type, t)} · {visibilityLabel(account.visibility, t)}{account.archived_at ? ` · ${t("common.archived")}` : ""}
          </StatusBadge>
          {!account.archived_at && (
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirming(true)}>{t("accounts.archive")}</Button>
          )}
        </div>
        <Alert message={error} />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {([["posted", account.posted_balance], ["pending", account.pending_impact], ["projected", account.projected_balance]] as const).map(([labelKey, value]) => (
            <Panel key={labelKey} className="p-5">
              <p className="text-sm text-[#5d716b]">{t(`accounts.${labelKey}`)}</p>
              <p className="mt-2 text-2xl font-semibold">{fmt.money(value, account.currency_code)}</p>
            </Panel>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold">
            {t("accounts.statusFilter")}
            <select aria-label={t("accounts.statusFilter")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={`ml-2 w-auto font-normal ${controlClasses}`}>
              <option value="all">{t("status.all")}</option>
              <option value="posted">{t("status.posted")}</option>
              <option value="pending">{t("status.pending")}</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            {t("accounts.from")}
            <input type="date" aria-label={t("accounts.fromAria")} value={from} onChange={(event) => setFrom(event.target.value)} className={`ml-2 w-auto font-normal ${controlClasses}`} />
          </label>
          <label className="text-sm font-semibold">
            {t("accounts.to")}
            <input type="date" aria-label={t("accounts.toAria")} value={to} onChange={(event) => setTo(event.target.value)} className={`ml-2 w-auto font-normal ${controlClasses}`} />
          </label>
        </div>
        <Panel padded={false} className="mt-4">
          {filteredTransactions.length === 0 ? (
            <p className="p-6 text-sm text-[#5d716b]">{t("accounts.noActivity")}</p>
          ) : (
            filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between border-b border-[#e3d9c9] p-4 last:border-0">
                <span>
                  <b>{transaction.description}</b>
                  <small className="mt-1 block text-[#789089]">{fmt.date(transaction.occurred_on, selected?.time_zone)} · {statusLabel(transaction.status, t)}</small>
                </span>
                <span className="font-semibold">{fmt.money(displayTransactionAmount(transaction.kind, transaction.account_impact), account.currency_code)}</span>
              </div>
            ))
          )}
        </Panel>
        <Link href="/app/transactions/new" className={`mt-6 inline-block ${buttonClasses()}`}>{t("accounts.recordActivity")}</Link>
        {confirming && (
          <ConfirmDialog
            title={t("accounts.archiveTitle")}
            description={t("accounts.archiveDescription")}
            confirmLabel={t("accounts.archive")}
            onConfirm={archive}
            onCancel={() => setConfirming(false)}
            busy={archiving}
          />
        )}
      </>
    );
  };

  return <FinancialShell title={account?.name ?? t("accounts.fallbackTitle")}>{renderBody()}</FinancialShell>;
}
