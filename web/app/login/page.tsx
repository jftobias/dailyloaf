"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { ErrorSummary } from "@/components/error-summary";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { AuthLoading, usePublicOnly } from "@/components/route-guards";
import { formErrors } from "@/lib/form-errors";

export default function LoginPage() {
  const auth = usePublicOnly();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "loading" || auth.status === "authenticated") return <AuthLoading />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    setSubmitting(true);
    try {
      await auth.login(email.trim(), password);
      router.replace("/app");
    } catch (requestError) {
      setError(formErrors(requestError).form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#163c3b]">Sign in to DailyLoaf</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d716b]">Your household space is ready when you are.</p>
        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <ErrorSummary message={error} />
          <FormField id="email" label="Email address" type="email" value={email} autoComplete="email" placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} />
          <PasswordField id="password" label="Password" value={password} autoComplete="current-password" onChange={setPassword} />
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#0f4c4c] px-4 py-3 font-semibold text-[#fffdf8] transition hover:bg-[#0b3c3c] focus:outline-none focus:ring-4 focus:ring-[#d9ad5b]/60 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Signing you in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5d716b]">New to DailyLoaf? <Link href="/register" className="font-semibold text-[#0f4c4c] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">Create an account</Link></p>
      </div>
    </AuthLayout>
  );
}
