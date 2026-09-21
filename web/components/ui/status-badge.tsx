import type { ReactNode } from "react";

type Tone = "neutral" | "active" | "muted" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-[#edf4ef] text-[#163c3b]",
  active: "bg-[#0f4c4c] text-[#fffdf8]",
  muted: "bg-[#eee7da] text-[#789089]",
  danger: "bg-[#fff0ed] text-[#8c3028]",
};

export function StatusBadge({ tone = "neutral", children }: Readonly<{ tone?: Tone; children: ReactNode }>) {
  return <span className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-medium ${tones[tone]}`}>{children}</span>;
}
