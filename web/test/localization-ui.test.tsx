import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithLocale, renderWithProviders, TEST_USER } from "./helpers";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LanguageSelector } from "@/components/language-selector";
import LoginPage from "@/app/login/page";
import NewAccountPage from "@/app/app/accounts/new/page";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/app/accounts/new",
  useParams: () => ({}),
}));

function mockUnauthenticated() {
  vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({}), { status: 401 }));
}

describe("localized rendering", () => {
  it("renders the login page in English", async () => {
    mockUnauthenticated();
    renderWithProviders(<LoginPage />, "en");
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument());
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("renders the login page in Spanish", async () => {
    mockUnauthenticated();
    renderWithProviders(<LoginPage />, "es");
    await waitFor(() => expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument());
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByText("¿Nuevo en DailyLoaf?")).toBeInTheDocument();
  });

  it("keeps document lang in sync with the resolved locale", async () => {
    mockUnauthenticated();
    renderWithProviders(<LoginPage />, "es");
    await waitFor(() => expect(document.documentElement.lang).toBe("es"));
  });
});

describe("language selector", () => {
  it("persists the explicit selection in a cookie and re-renders", async () => {
    document.cookie = `${LOCALE_COOKIE}=; max-age=0; path=/`;
    renderWithLocale(
      <>
        <LanguageSelector />
        <ConfirmDialog title="Title" description="Body" confirmLabel="Do it" onConfirm={() => {}} onCancel={() => {}} />
      </>,
      "en",
    );

    const selector = screen.getByRole("combobox", { name: "Language" });
    fireEvent.change(selector, { target: { value: "es" } });

    expect(document.cookie).toContain(`${LOCALE_COOKIE}=es`);
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument());
    await waitFor(() => expect(document.documentElement.lang).toBe("es"));
  });
});

describe("alert primitive", () => {
  it.each([undefined, null, "", "   "])("renders nothing and reserves no space for %j", (message) => {
    const { container } = renderWithLocale(<Alert message={message} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders an assertive alert only when a real message exists", () => {
    renderWithLocale(<Alert message="Something failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
  });
});

describe("account creation form alert regression", () => {
  function mockAuthenticated() {
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/auth/me")) return new Response(JSON.stringify({ user: TEST_USER }), { status: 200 });
      if (url.includes("/auth/csrf")) return new Response(JSON.stringify({ csrf_token: "token" }), { status: 200 });
      return new Response(JSON.stringify({ error: { code: "validation_failed", message: "Validation failed", details: { name: ["can't be blank"] } } }), { status: 422 });
    });
  }

  it("shows no alert before any error occurs", async () => {
    mockAuthenticated();
    renderWithProviders(<NewAccountPage />);
    await waitFor(() => expect(screen.getByLabelText("Account name")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders an accessible localized alert when a real error occurs", async () => {
    mockAuthenticated();
    renderWithProviders(<NewAccountPage />, "es");
    await waitFor(() => expect(screen.getByLabelText("Nombre de la cuenta")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.change(screen.getByLabelText("Nombre de la cuenta"), { target: { value: "Cuenta principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Revisa los campos resaltados."));
  });
});

describe("shared button primitive", () => {
  it("applies consistent size and variant classes", () => {
    expect(buttonClasses({ variant: "secondary", size: "sm" })).toContain("h-9");
    expect(buttonClasses({ variant: "primary", size: "md" })).toContain("h-11");
    expect(buttonClasses({ variant: "destructive" })).toContain("bg-[#8c3028]");
    expect(buttonClasses({ variant: "ghost" })).toContain("hover:bg-[#edf4ef]");
    expect(buttonClasses({ fullWidth: true })).toContain("w-full");
  });

  it("disables and marks busy while loading", () => {
    renderWithLocale(<Button loading loadingLabel="Saving…">Save</Button>);
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("confirmation dialog accessibility", () => {
  it("keeps dialog semantics, Escape handling, and localized cancel", () => {
    const cancel = vi.fn();
    renderWithLocale(<ConfirmDialog title="Archive?" description="Desc" confirmLabel="Archive" onConfirm={() => {}} onCancel={cancel} />, "es");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
