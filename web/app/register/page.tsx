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

const currencies = [
  { code: "COP", label: "COP — Colombian peso" },
  { code: "USD", label: "USD — US dollar" },
  { code: "EUR", label: "EUR — Euro" },
];

type Fields = { email: string; password: string; confirmation: string; household: string; currency: string };

type Errors = Partial<Record<keyof Fields, string>> & { form?: string };

function validate(fields: Fields): Errors {
  const errors: Errors = {};
  if (!fields.email.trim()) errors.email = "Enter your email address.";
  if (fields.password.length < 8) errors.password = "Use at least 8 characters.";
  if (fields.password !== fields.confirmation) errors.confirmation = "Passwords must match.";
  if (!fields.household.trim()) errors.household = "Enter a household name.";
  return errors;
}

export default function RegisterPage() {
  const auth = usePublicOnly();
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({ email: "", password: "", confirmation: "", household: "", currency: "COP" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "loading" || auth.status === "authenticated") return <AuthLoading />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validate(fields);
    if (Object.keys(validation).length > 0) {
      setErrors({ ...validation, form: "Please correct the highlighted fields." });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await auth.register({ email: fields.email.trim(), password: fields.password, household_name: fields.household.trim(), currency_code: fields.currency });
      router.replace("/app");
    } catch (error) {
      const normalized = formErrors(error);
      setErrors({ form: normalized.form });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">Start your household</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#163c3b]">Create your DailyLoaf</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d716b]">Set up a private household space. You can invite structure later as the product grows.</p>
        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <ErrorSummary message={errors.form} />
          <FormField id="email" label="Email address" type="email" value={fields.email} autoComplete="email" placeholder="you@example.com" error={errors.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} />
          <PasswordField id="password" label="Password" value={fields.password} autoComplete="new-password" error={errors.password} onChange={(password) => setFields({ ...fields, password })} />
          <PasswordField id="confirmation" label="Confirm password" value={fields.confirmation} autoComplete="new-password" error={errors.confirmation} onChange={(confirmation) => setFields({ ...fields, confirmation })} />
          <FormField id="household" label="Household name" value={fields.household} autoComplete="organization" placeholder="Our home" error={errors.household} onChange={(event) => setFields({ ...fields, household: event.target.value })} />
          <div className="space-y-2">
            <label htmlFor="currency" className="block text-sm font-semibold text-[#163c3b]">Household currency</label>
            <select id="currency" value={fields.currency} onChange={(event) => setFields({ ...fields, currency: event.target.value })} className="w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3 text-[#163c3b] outline-none focus:border-[#0f4c4c] focus:ring-4 focus:ring-[#0f4c4c]/10">
              {currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[#0f4c4c] px-4 py-3 font-semibold text-[#fffdf8] transition hover:bg-[#0b3c3c] focus:outline-none focus:ring-4 focus:ring-[#d9ad5b]/60 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Creating your space…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5d716b]">Already have an account? <Link href="/login" className="font-semibold text-[#0f4c4c] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">Sign in</Link></p>
      </div>
    </AuthLayout>
  );
}
