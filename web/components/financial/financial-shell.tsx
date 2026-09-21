"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";
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
    if (selected) window.localStorage.setItem(key, String(selected.id));
  }, [selected]);

  return { selected, households: user?.households ?? [], select: setPreference };
}

export function FinancialShell({ children, title }: Readonly<{ children: React.ReactNode; title: string }>) {
  const auth = useAuth();
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

  const links = [
    ["Overview", "/app"],
    ["Accounts", "/app/accounts"],
    ["Transactions", "/app/transactions"],
    ["Categories", "/app/settings/categories"],
  ] as const;

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-[#163c3b]">
      <header className="border-b border-[#d9cdb9] bg-[#fffdf8]"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><Link href="/app" aria-label="DailyLoaf overview"><BrandLogo compact /></Link><div className="flex items-center gap-3"><span className="hidden text-sm text-[#5d716b] sm:inline">{auth.user?.email}</span><button type="button" disabled={signingOut} onClick={signOut} className="rounded-lg border border-[#b9c9c0] px-3 py-2 text-sm font-semibold text-[#0f4c4c] focus:outline-none focus:ring-2 focus:ring-[#d9ad5b] disabled:opacity-60">{signingOut ? "Signing out…" : "Sign out"}</button></div></div></header>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56"><nav aria-label="Financial navigation" className="flex flex-wrap gap-2 overflow-visible lg:block lg:space-y-2">{links.map(([label, href]) => <Link key={href} href={href} className={`inline-block whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#d9ad5b] ${pathname === href ? "bg-[#0f4c4c] text-[#fffdf8]" : "text-[#5d716b] hover:bg-[#edf4ef]"}`}>{label}</Link>)}</nav></aside>
        <main className="min-w-0 flex-1"><div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">{selected?.name ?? "Household"}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1></div>{households.length > 1 && <label className="text-sm font-semibold">Household<select aria-label="Select household" value={selected?.id ?? ""} onChange={(event) => select(Number(event.target.value))} className="mt-2 block rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-3 py-2 font-normal focus:border-[#0f4c4c] focus:outline-none">{households.map((household: Household) => <option key={household.id} value={household.id}>{household.name}</option>)}</select></label>}</div>{children}</main>
      </div>
    </div>
  );
}
