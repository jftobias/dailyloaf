"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel, busy = false }: Readonly<{ title: string; description: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }>) {
  const t = useT();
  const dialogRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-[#163c3b]/40 p-5" onClick={onCancel}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl bg-[#fffdf8] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#5d716b]">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button ref={cancelRef} type="button" variant="secondary" size="sm" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button type="button" variant="destructive" size="sm" disabled={busy} loading={busy} loadingLabel={t("common.working")} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </section>
    </div>
  );
}
