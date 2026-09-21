"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireAuth, AuthLoading } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { FinancialLoading } from "@/components/financial/financial-loading";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listAccounts, type Account } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { accountTypeLabel, visibilityLabel } from "@/lib/i18n/presentation";

export default function AccountsPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const t = useT();
  const fmt = useFormatters();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    listAccounts(selected.id)
      .then((response) => setAccounts(response?.accounts ?? []))
      .catch((requestError) => setError(apiErrorMessage(requestError, t)))
      .finally(() => setLoading(false));
  }, [selected, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const renderBody = () => {
    if (error) return <Alert message={error} />;
    if (loading) return <FinancialLoading />;

    return (
      <>
        <div className="mb-5 flex justify-end">
          <Link href="/app/accounts/new" className={buttonClasses()}>{t("accounts.addAccount")}</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <Link key={account.id} href={`/app/accounts/${account.id}`} className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="mt-1 text-xs text-[#789089]">
                    {accountTypeLabel(account.account_type, t)} · {visibilityLabel(account.visibility, t)}{account.archived_at ? ` · ${t("common.archived")}` : ""}
                  </p>
                </div>
                <p className="font-semibold">{fmt.money(account.posted_balance, account.currency_code)}</p>
              </div>
              <p className="mt-4 text-xs text-[#5d716b]">
                {t("accounts.pendingProjected", { pending: fmt.money(account.pending_impact, account.currency_code), projected: fmt.money(account.projected_balance, account.currency_code) })}
              </p>
            </Link>
          ))}
          {accounts.length === 0 && <EmptyState title={t("accounts.empty")} />}
        </div>
      </>
    );
  };

  return <FinancialShell title={t("accounts.title")}>{renderBody()}</FinancialShell>;
}
