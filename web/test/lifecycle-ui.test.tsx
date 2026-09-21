import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithLocale } from "./helpers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { displayTransactionAmount } from "@/lib/financial-format";

describe("financial lifecycle UI", () => {
  it("uses accessible confirmation controls for destructive actions", () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    renderWithLocale(<ConfirmDialog title="Archive account?" description="History remains available." confirmLabel="Archive" onConfirm={confirm} onCancel={cancel} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(confirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("keeps semantic transaction amounts user-facing", () => {
    expect(displayTransactionAmount("expense", "-25.0000")).toBe("25.0000");
    expect(displayTransactionAmount("income", "500.0000")).toBe("500.0000");
  });
});
