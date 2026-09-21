import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand";

export function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-8 text-[#163c3b] sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#d9cdb9] bg-[#fffdf8] shadow-[0_24px_80px_rgba(15,76,76,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[#0f4c4c] p-10 text-[#fffdf8] lg:flex lg:flex-col lg:justify-between">
            <BrandLogo />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#e4bd6a]">A calmer view</p>
              <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">Build a clearer household financial life.</h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-[#d5e5df]">DailyLoaf keeps your household foundation private, deliberate, and ready for the decisions ahead.</p>
            </div>
            <p className="text-sm text-[#b8d3ca]">Your data belongs to your household.</p>
          </section>
          <section className="p-6 sm:p-10 lg:p-14">
            <div className="mb-8 lg:hidden"><BrandLogo /></div>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
