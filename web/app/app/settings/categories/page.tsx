"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { FormField } from "@/components/form-field";
import { archiveCategory, createCategory, listCategories, type Category } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { categoryLabel, kindLabel } from "@/lib/i18n/presentation";

export default function CategoriesPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const t = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [visibility, setVisibility] = useState<"shared" | "private">("shared");
  const [error, setError] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    if (selected) {
      listCategories(selected.id)
        .then((response) => setCategories(response?.categories ?? []))
        .catch((requestError) => setError(apiErrorMessage(requestError, t)));
    }
  };
  useEffect(refresh, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !name.trim()) return;
    setCreating(true);
    try {
      await createCategory(selected.id, { name: name.trim(), kind, visibility });
      setName("");
      refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setCreating(false);
    }
  }

  async function archive() {
    if (!selected || !archiveTarget) return;
    setArchiving(true);
    try {
      await archiveCategory(selected.id, archiveTarget.id);
      setArchiveTarget(null);
      refresh();
    } catch (requestError) {
      setError(apiErrorMessage(requestError, t));
    } finally {
      setArchiving(false);
    }
  }

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const renderGroup = (group: "income" | "expense") => (
    <div className="mt-3 flex flex-wrap gap-2">
      {categories.filter((category) => category.kind === group).map((category) => (
        <div key={category.id} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm ${category.archived_at ? "bg-[#eee7da] text-[#789089]" : "bg-[#edf4ef]"}`}>
          <span>
            {categoryLabel(category, t)}
            {category.is_default ? ` · ${t("common.default")}` : ""}
            {category.archived_at ? ` · ${t("common.archived")}` : ""}
          </span>
          {!category.archived_at && !category.is_default && (
            <button type="button" onClick={() => setArchiveTarget(category)} aria-label={t("categories.archiveAria", { name: category.name })} className="font-bold text-[#8c3028]">×</button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <FinancialShell title={t("categories.title")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="p-5">
          <Alert message={error} />
          <h2 className="font-semibold">{t("categories.incomeHeading")}</h2>
          {renderGroup("income")}
          <h2 className="mt-8 font-semibold">{t("categories.expensesHeading")}</h2>
          {renderGroup("expense")}
        </Panel>
        <Panel className="h-fit p-5" padded={false}>
          <form onSubmit={submit}>
            <h2 className="font-semibold">{t("categories.addCustom")}</h2>
            <div className="mt-4 space-y-4">
              <FormField id="category-name" label={t("categories.name")} value={name} onChange={(event) => setName(event.target.value)} />
              <SelectField id="category-kind" label={t("categories.kind")} value={kind} onChange={(event) => setKind(event.target.value as "income" | "expense")}>
                <option value="income">{kindLabel("income", t)}</option>
                <option value="expense">{kindLabel("expense", t)}</option>
              </SelectField>
              <SelectField id="category-visibility" label={t("categories.visibilityLabel")} value={visibility} onChange={(event) => setVisibility(event.target.value as "shared" | "private")}>
                <option value="shared">{t("visibility.shared")}</option>
                <option value="private">{t("visibility.private")}</option>
              </SelectField>
              <Button type="submit" loading={creating} loadingLabel={t("common.working")}>{t("categories.create")}</Button>
            </div>
          </form>
        </Panel>
      </div>
      {archiveTarget && (
        <ConfirmDialog
          title={t("categories.archiveTitle", { name: archiveTarget.name })}
          description={t("categories.archiveDescription")}
          confirmLabel={t("categories.archiveConfirm")}
          onConfirm={archive}
          onCancel={() => setArchiveTarget(null)}
          busy={archiving}
        />
      )}
    </FinancialShell>
  );
}
