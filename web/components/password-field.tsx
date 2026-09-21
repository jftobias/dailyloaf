"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";
import { FormField } from "@/components/form-field";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  autoComplete: string;
  onChange: (value: string) => void;
};

export function PasswordField({ id, label, value, error, autoComplete, onChange }: PasswordFieldProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <FormField
        id={id}
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        error={error}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="pr-20"
      />
      <button
        type="button"
        aria-label={visible ? t("auth.hideFieldPassword", { field: label.toLowerCase() }) : t("auth.showFieldPassword", { field: label.toLowerCase() })}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-9 rounded-lg px-2 py-1 text-xs font-semibold text-[#0f4c4c] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#d9ad5b]"
      >
        {visible ? t("auth.hidePassword") : t("auth.showPassword")}
      </button>
    </div>
  );
}
