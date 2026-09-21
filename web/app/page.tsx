"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand";

export default function Home() {
  const auth = useAuth();

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-6 py-10 text-[#163c3b] sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-between rounded-3xl border border-[#d9cdb9] bg-[#fffdf8] p-7 shadow-[0_24px_80px_rgba(15,76,76,0.1)] sm:p-12">
        <BrandLogo />
        <section className="max-w-2xl py-16"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b0802f]">Household clarity</p><h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">A calmer place to begin.</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#5d716b]">DailyLoaf is building a private, thoughtful foundation for your household financial life.</p><div className="mt-9 flex flex-wrap gap-3">{auth.status === "authenticated" ? <Link href="/app" className="rounded-xl bg-[#0f4c4c] px-5 py-3 font-semibold text-[#fffdf8] focus:outline-none focus:ring-4 focus:ring-[#d9ad5b]/60">Open your space</Link> : <><Link href="/register" className="rounded-xl bg-[#0f4c4c] px-5 py-3 font-semibold text-[#fffdf8] focus:outline-none focus:ring-4 focus:ring-[#d9ad5b]/60">Create your space</Link><Link href="/login" className="rounded-xl border border-[#b9c9c0] px-5 py-3 font-semibold text-[#0f4c4c] focus:outline-none focus:ring-4 focus:ring-[#d9ad5b]/60">Sign in</Link></>}</div></section>
        <p className="text-sm text-[#789089]">Financial calculations remain authoritative in Rails.</p>
      </div>
    </main>
  );
}
