import type { InputHTMLAttributes } from "react";
import { controlClasses } from "@/components/ui/control-classes";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormField({ label, error, hint, id, className = "", ...inputProps }: FormFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId = hint && id ? `${id}-hint` : undefined;
  const describedBy = error ? errorId : hintId;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#163c3b]">{label}</label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`${controlClasses} ${className}`}
      />
      {hint && !error && <p id={hintId} className="text-sm text-[#5d716b]">{hint}</p>}
      {error && <p id={errorId} className="text-sm font-medium text-[#a43d32]">{error}</p>}
    </div>
  );
}
