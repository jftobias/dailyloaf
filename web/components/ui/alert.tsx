/**
 * The single assertive error region for the app. Renders nothing — and reserves
 * no space — when the message is null, undefined, empty, or whitespace-only.
 */
export function Alert({ message }: Readonly<{ message?: string | null }>) {
  if (!message || !message.trim()) return null;

  return (
    <div role="alert" className="rounded-xl border border-[#d99a91] bg-[#fff0ed] px-4 py-3 text-sm font-medium text-[#8c3028]">
      {message}
    </div>
  );
}
