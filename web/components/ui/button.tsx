import type { ButtonHTMLAttributes, Ref } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9ad5b]/60 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#0f4c4c] text-[#fffdf8] hover:bg-[#0b3c3c]",
  secondary: "border border-[#b9c9c0] bg-[#fffdf8] text-[#0f4c4c] hover:bg-[#edf4ef]",
  destructive: "bg-[#8c3028] text-white hover:bg-[#742a23]",
  ghost: "text-[#0f4c4c] hover:bg-[#edf4ef]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: Readonly<{ variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string }> = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({ variant, size, fullWidth, loading = false, loadingLabel, disabled, children, ref, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className: props.className })}
    >
      {loading ? loadingLabel ?? children : children}
    </button>
  );
}
