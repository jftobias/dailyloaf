"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { useT } from "@/components/locale-provider";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { AuthLoading, usePublicOnly } from "@/components/route-guards";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formErrors } from "@/lib/form-errors";

export default function LoginPage() {
  const auth = usePublicOnly();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "loading" || auth.status === "authenticated") return <AuthLoading />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError(t("auth.enterEmailAndPassword"));
      return;
    }

    setSubmitting(true);
    try {
      await auth.login(email.trim(), password);
      router.replace("/app");
    } catch (requestError) {
      setError(formErrors(requestError, t).form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">{t("auth.welcomeBack")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#163c3b]">{t("auth.signInTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d716b]">{t("auth.signInSubtitle")}</p>
        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <Alert message={error} />
          <FormField id="email" label={t("auth.emailAddress")} type="email" value={email} autoComplete="email" placeholder={t("auth.emailPlaceholder")} onChange={(event) => setEmail(event.target.value)} />
          <PasswordField id="password" label={t("auth.password")} value={password} autoComplete="current-password" onChange={setPassword} />
          <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel={t("auth.signingIn")}>
            {t("auth.signIn")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5d716b]">
          {t("auth.newHere")}{" "}
          <Link href="/register" className="font-semibold text-[#0f4c4c] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">{t("auth.createAnAccount")}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
