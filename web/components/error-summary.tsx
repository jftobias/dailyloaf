export function ErrorSummary({ message }: Readonly<{ message?: string }>) {
  if (!message) return null;

  return (
    <div role="alert" className="rounded-xl border border-[#d99a91] bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#8c3028]">
      {message}
    </div>
  );
}
