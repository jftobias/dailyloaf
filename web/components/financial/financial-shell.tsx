"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/components/locale-provider";
import { LanguageSelector } from "@/components/language-selector";
import { controlClasses } from "@/components/ui/control-classes";
import type { Household } from "@/lib/api-client";

const key = "dailyloaf.selectedHouseholdId";

export function useSelectedHousehold() {
  const { user } = useAuth();
  const [preference, setPreference] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const id = Number(window.localStorage.getItem(key));
    return Number.isFinite(id) && id > 0 ? id : null;
  });
  const selected = user?.households.find((household) => household.id === preference) ?? user?.households[0];

  useEffect(() => {
    const changed = (event: Event) => setPreference((event as CustomEvent<number>).detail);
    window.addEventListener("dailyloaf:household-changed", changed);
    if (selected) window.localStorage.setItem(key, String(selected.id));
    return () => window.removeEventListener("dailyloaf:household-changed", changed);
  }, [selected]);

  function select(id: number) {
    setPreference(id);
    window.localStorage.setItem(key, String(id));
    window.dispatchEvent(new CustomEvent("dailyloaf:household-changed", { detail: id }));
  }

  return { selected, households: user?.households ?? [], select };
}

const NAV_LINKS = [
  { key: "nav.overview", href: "/app" },
  { key: "nav.accounts", href: "/app/accounts" },
  { key: "nav.transactions", href: "/app/transactions" },
  { key: "nav.categories", href: "/app/settings/categories" },
] as const;

export function FinancialShell({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  const auth = useAuth();
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const { selected, households, select } = useSelectedHousehold();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await auth.logout();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-[#163c3b]">
      <header className="border-b border-[#d9cdb9] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/app" aria-label={t("nav.overviewLink")}><BrandLogo compact /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#5d716b] sm:inline">{auth.user?.email}</span>
            <LanguageSelector />
            <button type="button" disabled={signingOut} onClick={signOut} className="rounded-lg border border-[#b9c9c0] px-3 py-2 text-sm font-semibold text-[#0f4c4c] focus:outline-none focus:ring-2 focus:ring-[#d9ad5b] disabled:opacity-60">
              {signingOut ? t("nav.signingOut") : t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <nav aria-label={t("nav.financial")} className="flex flex-wrap gap-2 overflow-visible lg:block lg:space-y-2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-block whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#d9ad5b] ${pathname === item.href ? "bg-[#0f4c4c] text-[#fffdf8]" : "text-[#5d716b] hover:bg-[#edf4ef]"}`}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">{selected?.name ?? t("common.household")}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
            </div>
            {households.length > 1 && (
              <label className="text-sm font-semibold">
                {t("common.household")}
                <select aria-label={t("common.selectHousehold")} value={selected?.id ?? ""} onChange={(event) => select(Number(event.target.value))} className={`mt-2 block font-normal ${controlClasses}`}>
                  {households.map((household: Household) => <option key={household.id} value={household.id}>{household.name}</option>)}
                </select>
              </label>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
