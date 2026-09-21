"use client";

import Link from "next/link";
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
import {
  deleteTransaction,
  getAccount,
  getTransaction,
  listCategories,
  postTransaction,
  reverseTransaction,
  updateTransaction,
  type Account,
  type Category,
  type FinancialTransaction,
} from "@/lib/api-client";
import { displayTransactionAmount, positiveAmountToImpact } from "@/lib/financial-format";
import { apiErrorMessage } from "@/lib/form-errors";
import { categoryLabel, kindLabel, statusLabel } from "@/lib/i18n/presentation";

export default function TransactionDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ transactionId: string }>();
  const t = useT();
  const fmt = useFormatters();
  const [transaction, setTransaction] = useState<FinancialTransaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [confirm, setConfirm] = useState<"reverse" | "correct" | "delete" | null>(null);
  const [working, setWorking] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const load = () => {
    if (!selected || !params.transactionId) return;
    Promise.all([getTransaction(selected.id, Number(params.transactionId)), listCategories(selected.id)])
      .then(async ([transactionResponse, categoryResponse]) => {
        const item = transactionResponse?.transaction ?? null;
        setTransaction(item);
        setCategories(categoryResponse?.categories ?? []);
        if (!item) return;
        const accountResponse = await getAccount(selected.id, item.account_id);
        setAccount(accountResponse?.account ?? null);
        setDescription(item.description);
        setAmount(displayTransactionAmount(item.kind, item.account_impact));
      })
      .catch((requestError: unknown) => setError(apiErrorMessage(requestError, t)));
  };

  useEffect(load, [params.transactionId, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  async function perform(action: "reverse" | "correct" | "delete") {
    if (!selected || !transaction) return;
    setWorking(true);
    try {
      if (action === "reverse") await reverseTransaction(selected.id, transaction.id);
      else if (action === "delete") await deleteTransaction(selected.id, transaction.id);
      else await updateTransaction(selected.id, transaction.id, {
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        kind: transaction.kind,
        account_impact: positiveAmountToImpact(transaction.kind === "expense" ? "expense" : "income", amount),
        occurred_on: transaction.occurred_on,
        description,
        status: "posted",
      });
      setConfirm(null);
      setCorrecting(false);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setWorking(false);
    }
  }

  async function savePending(event: FormEvent) {
    event.preventDefault();
    if (!selected || !transaction) return;
    setWorking(true);
    try {
      await updateTransaction(selected.id, transaction.id, { account_id: transaction.account_id, category_id: transaction.category_id, kind: transaction.kind, account_impact: positiveAmountToImpact(transaction.kind === "expense" ? "expense" : "income", amount), occurred_on: transaction.occurred_on, description, status: "pending" });
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setWorking(false);
    }
  }

  async function post() {
    if (!selected || !transaction) return;
    setWorking(true);
    try {
      await postTransaction(selected.id, transaction.id);
      load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setWorking(false);
    }
  }

  if (error && !transaction) return <FinancialShell title={t("transactions.fallbackTitle")}><Alert message={error} /></FinancialShell>;
  if (!transaction) return <FinancialShell title={t("transactions.detailTitle")}><FinancialLoading /></FinancialShell>;

  const categoryRecord = categories.find((category) => category.id === transaction.category_id);
  const categoryName = categoryRecord ? categoryLabel(categoryRecord, t) : t("common.notCategorized");

  return (
    <FinancialShell title={t("transactions.detailTitle")}>
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#b0802f]">{kindLabel(transaction.kind, t)}</p>
            <h2 className="mt-2 text-2xl font-semibold">{transaction.description}</h2>
            <p className="mt-1 text-sm text-[#5d716b]">{fmt.date(transaction.occurred_on, selected?.time_zone)} · {statusLabel(transaction.status, t)}</p>
          </div>
          <p className="text-2xl font-semibold">{fmt.money(displayTransactionAmount(transaction.kind, transaction.account_impact), account?.currency_code ?? "COP")}</p>
        </div>
        <Alert message={error} />
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-[#789089]">{t("transactions.account")}</dt><dd className="font-semibold">{account?.name}</dd></div>
          <div><dt className="text-[#789089]">{t("transactions.category")}</dt><dd className="font-semibold">{categoryName}</dd></div>
          <div><dt className="text-[#789089]">{t("transactions.created")}</dt><dd>{fmt.dateTime(transaction.created_at, selected?.time_zone)}</dd></div>
          <div><dt className="text-[#789089]">{t("transactions.updated")}</dt><dd>{fmt.dateTime(transaction.updated_at, selected?.time_zone)}</dd></div>
        </dl>
        {(transaction.reversal_of_id || transaction.replacement_for_id || transaction.reversal_id || transaction.replacement_id) && (
          <div className="mt-6 rounded-xl bg-[#edf4ef] p-4 text-sm">
            <p className="font-semibold">{t("transactions.correctionHistory")}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {transaction.reversal_of_id && <Link href={`/app/transactions/${transaction.reversal_of_id}`} className="font-semibold text-[#0f4c4c] underline">{t("transactions.viewOriginal")}</Link>}
              {transaction.replacement_for_id && <Link href={`/app/transactions/${transaction.replacement_for_id}`} className="font-semibold text-[#0f4c4c] underline">{t("transactions.viewReplaced")}</Link>}
              {transaction.reversal_id && <Link href={`/app/transactions/${transaction.reversal_id}`} className="font-semibold text-[#0f4c4c] underline">{t("transactions.viewReversal")}</Link>}
              {transaction.replacement_id && <Link href={`/app/transactions/${transaction.replacement_id}`} className="font-semibold text-[#0f4c4c] underline">{t("transactions.viewReplacement")}</Link>}
            </div>
          </div>
        )}
      </Panel>
      {transaction.status === "pending" ? (
        <Panel className="mt-6" padded={false}>
          <form onSubmit={savePending} className="p-6">
            <h2 className="font-semibold">{t("transactions.editPendingTitle")}</h2>
            <input aria-label={t("transactions.description")} value={description} onChange={(event) => setDescription(event.target.value)} className={`mt-4 ${controlClasses}`} />
            <input aria-label={t("transactions.amount")} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={`mt-3 ${controlClasses}`} />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" size="sm" loading={working} loadingLabel={t("common.working")}>{t("transactions.saveEdit")}</Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => setConfirm("delete")}>{t("transactions.deletePending")}</Button>
              <Button type="button" size="sm" variant="secondary" onClick={post}>{t("transactions.post")}</Button>
            </div>
          </form>
        </Panel>
      ) : (
        <>
          {correcting && (
            <Panel className="mt-6" padded={false}>
              <form onSubmit={(event: FormEvent) => { event.preventDefault(); setConfirm("correct"); }} className="p-6">
                <h2 className="font-semibold">{t("transactions.correctTitle")}</h2>
                <p className="mt-2 text-sm text-[#5d716b]">{t("transactions.correctExplanation")}</p>
                <input aria-label={t("transactions.correctedDescription")} value={description} onChange={(event) => setDescription(event.target.value)} className={`mt-4 ${controlClasses}`} />
                <input aria-label={t("transactions.correctedAmount")} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={`mt-3 ${controlClasses}`} />
                <Button type="submit" size="sm" className="mt-4">{t("transactions.reviewCorrection")}</Button>
              </form>
            </Panel>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => setCorrecting(true)}>{t("transactions.correctTitle")}</Button>
            <Button type="button" variant="destructive" disabled={Boolean(transaction.reversal_of_id || transaction.reversal_id)} onClick={() => setConfirm("reverse")}>
              {transaction.reversal_of_id || transaction.reversal_id ? t("transactions.alreadyReversed") : t("transactions.reverse")}
            </Button>
          </div>
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm === "correct" ? t("transactions.confirmCorrectTitle") : confirm === "reverse" ? t("transactions.confirmReverseTitle") : t("transactions.confirmDeleteTitle")}
          description={confirm === "correct" ? t("transactions.confirmCorrectDescription") : t("transactions.confirmLifecycleDescription")}
          confirmLabel={confirm === "correct" ? t("transactions.createCorrection") : confirm === "reverse" ? t("transactions.reverseConfirm") : t("transactions.deletePendingConfirm")}
          onConfirm={() => perform(confirm)}
          onCancel={() => setConfirm(null)}
          busy={working}
        />
      )}
    </FinancialShell>
  );
}
