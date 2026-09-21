export function FinancialError({ message }: Readonly<{ message: string }>) {
  return <div role="alert" className="rounded-2xl border border-[#d99a91] bg-[#fff0ed] p-5 text-sm font-medium text-[#8c3028]">{message}</div>;
}
