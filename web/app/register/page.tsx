"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { useT, type TFunction } from "@/components/locale-provider";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { AuthLoading, usePublicOnly } from "@/components/route-guards";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { formErrors } from "@/lib/form-errors";

const CURRENCIES = ["COP", "USD", "EUR"] as const;

type Fields = { email: string; password: string; confirmation: string; household: string; currency: string };

type Errors = Partial<Record<keyof Fields, string>> & { form?: string };

function validate(fields: Fields, t: TFunction): Errors {
  const errors: Errors = {};
  if (!fields.email.trim()) errors.email = t("auth.enterEmail");
  if (fields.password.length < 8) errors.password = t("auth.passwordMinLength");
  if (fields.password !== fields.confirmation) errors.confirmation = t("auth.passwordsMustMatch");
  if (!fields.household.trim()) errors.household = t("auth.enterHouseholdName");
  return errors;
}

export default function RegisterPage() {
  const auth = usePublicOnly();
  const router = useRouter();
  const t = useT();
  const [fields, setFields] = useState<Fields>({ email: "", password: "", confirmation: "", household: "", currency: "COP" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "loading" || auth.status === "authenticated") return <AuthLoading />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validate(fields, t);
    if (Object.keys(validation).length > 0) {
      setErrors({ ...validation, form: t("auth.correctHighlighted") });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await auth.register({ email: fields.email.trim(), password: fields.password, household_name: fields.household.trim(), currency_code: fields.currency });
      router.replace("/app");
    } catch (error) {
      const normalized = formErrors(error, t);
      setErrors({ form: normalized.form });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b0802f]">{t("auth.startHousehold")}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#163c3b]">{t("auth.registerTitle")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5d716b]">{t("auth.registerSubtitle")}</p>
        <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
          <Alert message={errors.form} />
          <FormField id="email" label={t("auth.emailAddress")} type="email" value={fields.email} autoComplete="email" placeholder={t("auth.emailPlaceholder")} error={errors.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} />
          <PasswordField id="password" label={t("auth.password")} value={fields.password} autoComplete="new-password" error={errors.password} onChange={(password) => setFields({ ...fields, password })} />
          <PasswordField id="confirmation" label={t("auth.confirmPassword")} value={fields.confirmation} autoComplete="new-password" error={errors.confirmation} onChange={(confirmation) => setFields({ ...fields, confirmation })} />
          <FormField id="household" label={t("auth.householdName")} value={fields.household} autoComplete="organization" placeholder={t("auth.householdPlaceholder")} error={errors.household} onChange={(event) => setFields({ ...fields, household: event.target.value })} />
          <SelectField id="currency" label={t("auth.householdCurrency")} value={fields.currency} onChange={(event) => setFields({ ...fields, currency: event.target.value })}>
            {CURRENCIES.map((code) => <option key={code} value={code}>{t(`currencies.${code}`)}</option>)}
          </SelectField>
          <Button type="submit" size="lg" fullWidth loading={submitting} loadingLabel={t("auth.creatingSpace")}>
            {t("auth.createAccount")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[#5d716b]">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-semibold text-[#0f4c4c] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]">{t("landing.signIn")}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
