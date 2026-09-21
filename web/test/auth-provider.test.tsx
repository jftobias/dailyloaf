import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth-provider";
import { usePublicOnly, useRequireAuth } from "@/components/route-guards";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function PublicGuardStatus() {
  const auth = usePublicOnly();
  return <p>{auth.status}</p>;
}

function PrivateGuardStatus() {
  const auth = useRequireAuth();
  return <p>{auth.status}</p>;
}

describe("authentication routing", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it("shows loading and redirects unauthenticated app users", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(response({}, 401));
    render(<AuthProvider><PrivateGuardStatus /></AuthProvider>);

    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("redirects authenticated users away from public auth pages", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(response({ user: { id: 1, email: "person@example.com", households: [] } }));
    render(<AuthProvider><PublicGuardStatus /></AuthProvider>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
  });
});

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
