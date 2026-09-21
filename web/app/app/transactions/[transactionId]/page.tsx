"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialError } from "@/components/financial/financial-error";
import { FinancialLoading } from "@/components/financial/financial-loading";
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

export default function TransactionDetailPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const params = useParams<{ transactionId: string }>();
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
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Transaction could not be loaded."));
  };

  useEffect(load, [params.transactionId, selected]);

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
      setError(requestError instanceof Error ? requestError.message : "The transaction could not be changed.");
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
      setError(requestError instanceof Error ? requestError.message : "The pending transaction could not be edited.");
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
      setError(requestError instanceof Error ? requestError.message : "The transaction could not be posted.");
    } finally {
      setWorking(false);
    }
  }

  if (error && !transaction) return <FinancialShell title="Transaction"><FinancialError message={error} /></FinancialShell>;
  if (!transaction) return <FinancialShell title="Transaction detail"><FinancialLoading /></FinancialShell>;

  const categoryName = categories.find((category) => category.id === transaction.category_id)?.name ?? "Not categorized";

  return (
    <FinancialShell title="Transaction detail">
      <div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm uppercase tracking-[0.2em] text-[#b0802f]">{transaction.kind}</p><h2 className="mt-2 text-2xl font-semibold">{transaction.description}</h2><p className="mt-1 text-sm text-[#5d716b]">{transaction.occurred_on} · {transaction.status}</p></div>
          <p className="text-2xl font-semibold">{displayTransactionAmount(transaction.kind, transaction.account_impact)} {account?.currency_code}</p>
        </div>
        {error && <div className="mt-4"><FinancialError message={error} /></div>}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#789089]">Account</dt><dd className="font-semibold">{account?.name}</dd></div><div><dt className="text-[#789089]">Category</dt><dd className="font-semibold">{categoryName}</dd></div><div><dt className="text-[#789089]">Created</dt><dd>{new Date(transaction.created_at).toLocaleString()}</dd></div><div><dt className="text-[#789089]">Updated</dt><dd>{new Date(transaction.updated_at).toLocaleString()}</dd></div></dl>
        {(transaction.reversal_of_id || transaction.replacement_for_id || transaction.reversal_id || transaction.replacement_id) && <div className="mt-6 rounded-xl bg-[#edf4ef] p-4 text-sm"><p className="font-semibold">Correction history</p><div className="mt-2 flex flex-wrap gap-3">{transaction.reversal_of_id && <a href={`/app/transactions/${transaction.reversal_of_id}`} className="font-semibold text-[#0f4c4c] underline">View original record</a>}{transaction.replacement_for_id && <a href={`/app/transactions/${transaction.replacement_for_id}`} className="font-semibold text-[#0f4c4c] underline">View replaced record</a>}{transaction.reversal_id && <a href={`/app/transactions/${transaction.reversal_id}`} className="font-semibold text-[#0f4c4c] underline">View reversal</a>}{transaction.replacement_id && <a href={`/app/transactions/${transaction.replacement_id}`} className="font-semibold text-[#0f4c4c] underline">View replacement</a>}</div></div>}
      </div>
      {transaction.status === "pending" ? (
        <form onSubmit={savePending} className="mt-6 rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6">
          <h2 className="font-semibold">Edit pending transaction</h2>
          <input aria-label="Description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-4 w-full rounded-xl border border-[#cdbfa9] p-3" />
          <input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="mt-3 w-full rounded-xl border border-[#cdbfa9] p-3" />
          <div className="mt-4 flex gap-3"><button disabled={working} className="rounded-xl bg-[#0f4c4c] px-4 py-2 font-semibold text-white">Save edit</button><button type="button" onClick={() => setConfirm("delete")} className="rounded-xl border border-[#d99a91] px-4 py-2 font-semibold text-[#8c3028]">Delete pending</button><button type="button" onClick={post} className="rounded-xl border border-[#b9c9c0] px-4 py-2 font-semibold">Post</button></div>
        </form>
      ) : (
        <>
          {correcting && <form onSubmit={(event: FormEvent) => { event.preventDefault(); setConfirm("correct"); }} className="mt-6 rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-6"><h2 className="font-semibold">Correct posted record</h2><p className="mt-2 text-sm text-[#5d716b]">The original will remain preserved and a reversal/replacement pair will be created.</p><input aria-label="Corrected description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-4 w-full rounded-xl border border-[#cdbfa9] p-3" /><input aria-label="Corrected amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="mt-3 w-full rounded-xl border border-[#cdbfa9] p-3" /><button className="mt-4 rounded-xl bg-[#0f4c4c] px-4 py-2 font-semibold text-white">Review correction</button></form>}
          <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => setCorrecting(true)} className="rounded-xl bg-[#0f4c4c] px-4 py-3 font-semibold text-white">Correct posted record</button><button type="button" disabled={Boolean(transaction.reversal_of_id || transaction.reversal_id)} onClick={() => setConfirm("reverse")} className="rounded-xl border border-[#d99a91] px-4 py-3 font-semibold text-[#8c3028] disabled:opacity-50">{transaction.reversal_of_id || transaction.reversal_id ? "Already corrected/reversed" : "Reverse"}</button></div>
        </>
      )}
      {confirm && <ConfirmDialog title={confirm === "correct" ? "Correct this posted transaction?" : confirm === "reverse" ? "Reverse this transaction?" : "Delete pending transaction?"} description={confirm === "correct" ? "The original remains preserved. DailyLoaf will create a reversal and replacement." : "This action changes the financial record while preserving the ledger rules."} confirmLabel={confirm === "correct" ? "Create correction" : confirm === "reverse" ? "Reverse transaction" : "Delete pending"} onConfirm={() => perform(confirm)} onCancel={() => setConfirm(null)} busy={working} />}
    </FinancialShell>
  );
}
