export function EmptyState({ title, body }: Readonly<{ title: string; body?: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-[#b9c9c0] bg-[#fffdf8] p-8">
      <p className="font-semibold text-[#163c3b]">{title}</p>
      {body && <p className="mt-2 text-sm text-[#5d716b]">{body}</p>}
    </div>
  );
}
