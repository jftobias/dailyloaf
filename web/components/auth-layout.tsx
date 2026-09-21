"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/locale-provider";
import { BrandLogo } from "@/components/brand";
import { LanguageSelector } from "@/components/language-selector";

export function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const t = useT();

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-5 py-8 text-[#163c3b] sm:px-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#d9cdb9] bg-[#fffdf8] shadow-[0_24px_80px_rgba(15,76,76,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-[#0f4c4c] p-10 text-[#fffdf8] lg:flex lg:flex-col lg:justify-between">
            <BrandLogo />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#e4bd6a]">{t("auth.panelKicker")}</p>
              <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">{t("auth.panelTitle")}</h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-[#d5e5df]">{t("auth.panelSubtitle")}</p>
            </div>
            <p className="text-sm text-[#b8d3ca]">{t("auth.panelFooter")}</p>
          </section>
          <section className="p-6 sm:p-10 lg:p-14">
            <div className="mb-8 flex items-start justify-between gap-4 lg:hidden">
              <BrandLogo />
              <LanguageSelector />
            </div>
            <div className="hidden lg:flex lg:justify-end"><LanguageSelector /></div>
            <div className="mt-6 lg:mt-8">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
