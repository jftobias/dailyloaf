import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "./helpers";
import RegisterPage from "@/app/register/page";
import LoginPage from "@/app/login/page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("authentication forms", () => {
  it("shows registration validation errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    renderWithProviders(<RegisterPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please correct the highlighted fields.");
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
  });

  it("shows localized registration validation errors in Spanish", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    renderWithProviders(<RegisterPage />, "es");

    await waitFor(() => expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Corrige los campos resaltados.");
    expect(screen.getByText("Usa al menos 8 caracteres.")).toBeInTheDocument();
  });

  it("shows login validation errors without submitting", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
    renderWithProviders(<LoginPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address and password.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
