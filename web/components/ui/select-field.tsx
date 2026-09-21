import type { SelectHTMLAttributes } from "react";
import { controlClasses } from "@/components/ui/control-classes";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export function SelectField({ label, error, id, className = "", children, ...selectProps }: SelectFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#163c3b]">{label}</label>
      <select
        {...selectProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`${controlClasses} ${className}`}
      >
        {children}
      </select>
      {error && <p id={errorId} className="text-sm font-medium text-[#a43d32]">{error}</p>}
    </div>
  );
}
