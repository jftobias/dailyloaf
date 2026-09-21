/**
 * The single assertive status region for the app. Renders nothing — and
 * reserves no space — when the message is null, undefined, empty, or
 * whitespace-only. "error" uses role="alert" (assertive); "success" uses
 * role="status" (polite).
 */
export function Alert({ message, variant = "error", className = "" }: Readonly<{ message?: string | null; variant?: "error" | "success"; className?: string }>) {
  if (!message || !message.trim()) return null;

  const styles = variant === "success"
    ? "border-[#9dbfae] bg-[#edf4ef] text-[#0f4c4c]"
    : "border-[#d99a91] bg-[#fff0ed] text-[#8c3028]";

  return (
    <div role={variant === "success" ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles} ${className}`.trim()}>
      {message}
    </div>
  );
}
