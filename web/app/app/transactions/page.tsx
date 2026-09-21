"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { listTransactions, type FinancialTransaction } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { kindLabel, statusLabel } from "@/lib/i18n/presentation";

export default function TransactionsPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const t = useT();
  const fmt = useFormatters();
  const [items, setItems] = useState<FinancialTransaction[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selected) return;
    listTransactions(selected.id)
      .then((response) => setItems(response?.transactions ?? []))
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  }, [selected, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const renderBody = () => {
    if (error) return <Alert message={error} />;
    if (!items) return <FinancialLoading />;

    return (
      <>
        <div className="mb-5 flex justify-end">
          <Link href="/app/transactions/new" className={buttonClasses()}>{t("transactions.record")}</Link>
        </div>
        <Panel padded={false}>
          {items.length === 0 ? (
            <div className="p-1"><EmptyState title={t("transactions.empty")} /></div>
          ) : (
            items.map((item) => (
              <Link key={item.id} href={`/app/transactions/${item.id}`} className="flex flex-wrap justify-between gap-3 border-b border-[#e3d9c9] p-4 last:border-0 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">
                <div>
                  <p className="font-semibold">{item.description}</p>
                  <p className="mt-1 text-xs text-[#789089]">
                    {kindLabel(item.kind, t)} · {fmt.date(item.occurred_on, selected?.time_zone)} · {statusLabel(item.status, t)}{item.reversal_of_id ? ` · ${t("common.corrected")}` : ""}
                  </p>
                </div>
                <span className="font-semibold">{fmt.money(item.account_impact, selected?.currency_code ?? "COP")}</span>
              </Link>
            ))
          )}
        </Panel>
      </>
    );
  };

  return <FinancialShell title={t("transactions.title")}>{renderBody()}</FinancialShell>;
}
