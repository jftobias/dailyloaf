"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { controlClasses } from "@/components/ui/control-classes";
import { getTransfer, listAccounts, reverseTransfer, updateTransfer, type Account, type Transfer } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { statusLabel } from "@/lib/i18n/presentation";

export default function TransferDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ transferId: string }>();
  const t = useT();
  const fmt = useFormatters();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const load = () => {
    if (!selected || !params.transferId) return;
    Promise.all([getTransfer(selected.id, Number(params.transferId)), listAccounts(selected.id)])
      .then(([transferResponse, accountsResponse]) => {
        const next = transferResponse?.transfer ?? null;
        setTransfer(next);
        setAmount(next?.amount ?? "");
        setAccounts(accountsResponse?.accounts ?? []);
      })
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  };
  useEffect(load, [params.transferId, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  async function reverse() {
    if (!selected || !transfer) return;
    setWorking(true);
    try {
      await reverseTransfer(selected.id, transfer.id);
      setConfirming(false);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setWorking(false);
    }
  }

  async function savePending(event: FormEvent) {
    event.preventDefault();
    if (!selected || !transfer) return;
    setWorking(true);
    try {
      await updateTransfer(selected.id, transfer.id, { source_account_id: transfer.source_account_id, destination_account_id: transfer.destination_account_id, amount });
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setWorking(false);
    }
  }

  if (error && !transfer) return <FinancialShell title={t("transfers.fallbackTitle")}><Alert message={error} /></FinancialShell>;

  const source = accounts.find((account) => account.id === transfer?.source_account_id)?.name ?? t("transfers.sourceFallback");
  const destination = accounts.find((account) => account.id === transfer?.destination_account_id)?.name ?? t("transfers.destinationFallback");

  return (
    <FinancialShell title={t("transfers.detailTitle")}>
      {!transfer ? <FinancialLoading /> : (
        <Panel>
          <p className="text-sm uppercase tracking-[0.2em] text-[#b0802f]">{statusLabel(transfer.status, t)}</p>
          <h2 className="mt-2 text-2xl font-semibold">{source} → {destination}</h2>
          <p className="mt-2 text-3xl font-semibold">{fmt.money(transfer.amount, transfer.currency_code)}</p>
          <p className="mt-3 text-sm text-[#5d716b]">{t("transfers.aggregateDetail", { count: transfer.transaction_ids.length })}</p>
          {transfer.status === "pending" && (
            <form onSubmit={savePending} className="mt-6 flex flex-wrap items-end gap-3">
              <label className="flex-1 text-sm font-semibold">
                {t("transfers.amount")}
                <input aria-label={t("transfers.amount")} value={amount} onChange={(event) => setAmount(event.target.value)} className={`mt-2 ${controlClasses}`} />
              </label>
              <Button type="submit" size="sm" loading={working} loadingLabel={t("common.working")}>{t("common.save")}</Button>
            </form>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="destructive" disabled={Boolean(transfer.reversal_of_id) || transfer.reversed || transfer.status !== "posted"} onClick={() => setConfirming(true)}>
              {transfer.reversal_of_id || transfer.reversed ? t("transfers.alreadyReversed") : t("transfers.reverse")}
            </Button>
          </div>
          <Alert message={error} />
          {confirming && (
            <ConfirmDialog
              title={t("transfers.confirmTitle")}
              description={t("transfers.confirmDescription")}
              confirmLabel={t("transfers.reverse")}
              onConfirm={reverse}
              onCancel={() => setConfirming(false)}
              busy={working}
            />
          )}
        </Panel>
      )}
    </FinancialShell>
  );
}
