import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCsrfToken, createTransaction, createTransfer, register } from "@/lib/api-client";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("api client", () => {
  beforeEach(() => {
    clearCsrfToken();
    vi.restoreAllMocks();
  });

  it("parses JSON request bodies and always includes credentials", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ csrf_token: "token-1" }))
      .mockResolvedValueOnce(response({ user: { id: 1, email: "person@example.com", households: [] }, household: { id: 1, name: "Home", currency_code: "COP", role: "owner" } }, 201));

    await register({ email: "person@example.com", password: "password123", household_name: "Home", currency_code: "COP" });

    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(request.credentials).toBe("include");
    const requestHeaders = new Headers(request.headers);
    expect(requestHeaders.get("X-CSRF-Token")).toBe("token-1");
    expect(requestHeaders.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(request.body))).toMatchObject({ email: "person@example.com", household_name: "Home" });
  });

  it("preserves idempotency keys and decimal-string payloads for financial mutations", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ csrf_token: "token-1" }))
      .mockResolvedValueOnce(response({ transaction: {} }, 201))
      .mockResolvedValueOnce(response({ transfer: {} }, 201));

    await createTransaction(7, { account_impact: "-25.0000", kind: "expense" }, "transaction-key");
    await createTransfer(7, { amount: "25.0000", source_account_id: 1, destination_account_id: 2 }, "transfer-key");

    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get("Idempotency-Key")).toBe("transaction-key");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).account_impact).toBe("-25.0000");
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Idempotency-Key")).toBe("transfer-key");
  });

  it("refreshes a stale CSRF token and retries once", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ csrf_token: "stale" }))
      .mockResolvedValueOnce(response({ error: { code: "invalid_csrf_token", message: "stale" } }, 422))
      .mockResolvedValueOnce(response({ csrf_token: "fresh" }))
      .mockResolvedValueOnce(response({ user: { id: 1, email: "person@example.com", households: [] }, household: { id: 1, name: "Home", currency_code: "COP", role: "owner" } }, 201));

    await register({ email: "person@example.com", password: "password123", household_name: "Home", currency_code: "COP" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(new Headers((fetchMock.mock.calls[3][1] as RequestInit).headers).get("X-CSRF-Token")).toBe("fresh");
  });

  it("does not retry CSRF failures indefinitely", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(response({ csrf_token: "token-1" }))
      .mockResolvedValueOnce(response({ error: { code: "invalid_csrf_token", message: "stale" } }, 422))
      .mockResolvedValueOnce(response({ csrf_token: "token-2" }))
      .mockResolvedValueOnce(response({ error: { code: "invalid_csrf_token", message: "still stale" } }, 422));

    await expect(register({ email: "person@example.com", password: "password123", household_name: "Home", currency_code: "COP" })).rejects.toMatchObject({ code: "invalid_csrf_token" });
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
