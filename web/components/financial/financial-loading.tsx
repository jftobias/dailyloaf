"use client";

import { useT } from "@/components/locale-provider";

export function FinancialLoading() {
  const t = useT();
  return <div role="status" className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-8 text-sm text-[#5d716b]">{t("common.loadingFinancialData")}</div>;
}
