import type { ReactNode } from "react";

export function Panel({ children, className = "", padded = true }: Readonly<{ children: ReactNode; className?: string; padded?: boolean }>) {
  return <div className={`rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] ${padded ? "p-6" : ""} ${className}`.trim()}>{children}</div>;
}
