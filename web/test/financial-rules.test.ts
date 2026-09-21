import { describe, expect, it } from "vitest";
import { positiveAmountToImpact } from "@/lib/financial-format";
import { availableCategories, compatibleTransferAccounts } from "@/lib/financial-rules";

const account = (id: number, visibility: "shared" | "private", owner: number | null = null) => ({ id, name: String(id), account_type: "checking" as const, currency_code: "COP", opening_balance: "0.0000", opening_balance_date: "2026-01-01", visibility, private_owner_id: owner, archived_at: null, posted_balance: "0.0000", pending_impact: "0.0000", projected_balance: "0.0000" });

describe("financial UI rules", () => {
  it("maps positive user amounts to the signed API contract without numeric conversion", () => {
    expect(positiveAmountToImpact("income", "1000.0000")).toBe("1000.0000");
    expect(positiveAmountToImpact("expense", "1000.0000")).toBe("-1000.0000");
  });

  it("filters transfer accounts by visibility, owner, and currency", () => {
    const accounts = [account(1, "shared"), account(2, "shared"), account(3, "private", 7), account(4, "private", 8)];
    expect(compatibleTransferAccounts(accounts, 1).map((item) => item.id)).toEqual([2]);
    expect(compatibleTransferAccounts(accounts, 3).map((item) => item.id)).toEqual([]);
  });

  it("filters categories by kind, archive state, and private owner", () => {
    const categories = [
      { id: 1, name: "Shared", kind: "expense" as const, visibility: "shared" as const, private_owner_id: null, is_default: true, archived_at: null },
      { id: 2, name: "Mine", kind: "expense" as const, visibility: "private" as const, private_owner_id: 7, is_default: false, archived_at: null },
      { id: 3, name: "Other", kind: "expense" as const, visibility: "private" as const, private_owner_id: 8, is_default: false, archived_at: null },
    ];
    expect(availableCategories(categories, "expense", account(3, "private", 7)).map((item) => item.id)).toEqual([1, 2]);
  });
});
