"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/components/locale-provider";
import { BrandLogo } from "@/components/brand";
import { LanguageSelector } from "@/components/language-selector";
import { buttonClasses } from "@/components/ui/button";

export default function Home() {
  const auth = useAuth();
  const t = useT();

  return (
    <main className="min-h-screen bg-[#f7f2e8] px-6 py-10 text-[#163c3b] sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-between rounded-3xl border border-[#d9cdb9] bg-[#fffdf8] p-7 shadow-[0_24px_80px_rgba(15,76,76,0.1)] sm:p-12">
        <div className="flex items-start justify-between gap-4">
          <BrandLogo />
          <LanguageSelector />
        </div>
        <section className="max-w-2xl py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#b0802f]">{t("landing.kicker")}</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">{t("landing.title")}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#5d716b]">{t("landing.subtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            {auth.status === "authenticated" ? (
              <Link href="/app" className={buttonClasses({ size: "lg" })}>{t("landing.openSpace")}</Link>
            ) : (
              <>
                <Link href="/register" className={buttonClasses({ size: "lg" })}>{t("landing.createSpace")}</Link>
                <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>{t("landing.signIn")}</Link>
              </>
            )}
          </div>
        </section>
        <p className="text-sm text-[#789089]">{t("landing.footer")}</p>
      </div>
    </main>
  );
}
