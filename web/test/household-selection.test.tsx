import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers";
import AppPage from "@/app/app/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/app" }));

const user = {
  id: 1,
  email: "person@example.com",
  households: [
    { id: 10, name: "Home", currency_code: "COP", role: "owner" },
    { id: 20, name: "Studio", currency_code: "USD", role: "member" },
  ],
};

describe("household selection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("rejects an invalid stored household ID and selects a valid household", async () => {
    window.localStorage.setItem("dailyloaf.selectedHouseholdId", "999");
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ user }), { status: 200, headers: { "Content-Type": "application/json" } })));

    renderWithProviders(<AppPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
      expect(window.localStorage.getItem("dailyloaf.selectedHouseholdId")).toBe("10");
    });
  });

  it("shows a selector for multiple households", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ user }), { status: 200, headers: { "Content-Type": "application/json" } })));

    renderWithProviders(<AppPage />);

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Select household" })).toBeInTheDocument());
  });
});
