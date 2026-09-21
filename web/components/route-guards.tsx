"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useT } from "@/components/locale-provider";

export function AuthLoading() {
  const t = useT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2e8] px-6 text-[#0f4c4c]">
      <p role="status" className="text-sm font-semibold tracking-wide">{t("common.checkingSession")}</p>
    </main>
  );
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "unauthenticated") router.replace("/login");
  }, [auth.status, router]);

  return auth;
}

export function usePublicOnly() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status === "authenticated") router.replace("/app");
  }, [auth.status, router]);

  return auth;
}
