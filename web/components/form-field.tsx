import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function FormField({ label, error, id, className = "", ...inputProps }: FormFieldProps) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#163c3b]">{label}</label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`w-full rounded-xl border border-[#cdbfa9] bg-[#fffdf8] px-4 py-3 text-[#163c3b] outline-none transition placeholder:text-[#7a8d87] focus:border-[#0f4c4c] focus:ring-4 focus:ring-[#0f4c4c]/10 disabled:cursor-not-allowed disabled:bg-[#eee7da] ${className}`}
      />
      {error && <p id={errorId} className="text-sm font-medium text-[#a43d32]">{error}</p>}
    </div>
  );
}
