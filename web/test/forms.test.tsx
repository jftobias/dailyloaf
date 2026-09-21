import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth-provider";
import RegisterPage from "@/app/register/page";
import LoginPage from "@/app/login/page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("authentication forms", () => {
  it("shows registration validation errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    render(<AuthProvider><RegisterPage /></AuthProvider>);

    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please correct the highlighted fields.");
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
  });

  it("shows login validation errors without submitting", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    render(<AuthProvider><LoginPage /></AuthProvider>);

    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address and password.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
