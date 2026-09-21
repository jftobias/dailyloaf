export function FinancialCard({ label, value, detail }: Readonly<{ label: string; value: string; detail?: string }>) {
  return <div className="rounded-2xl border border-[#d9cdb9] bg-[#fffdf8] p-5"><p className="text-sm font-medium text-[#5d716b]">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-[#163c3b]">{value}</p>{detail && <p className="mt-1 text-xs text-[#789089]">{detail}</p>}</div>;
}
