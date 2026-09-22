import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, TEST_USER } from "./helpers";
import { canonicalizeMoneyInput, formatMoneyEntry } from "@/lib/money-input";
import { flattenMessages, getMessages } from "@/lib/i18n/dictionary";
import Home from "@/app/page";
import NewAccountPage from "@/app/app/accounts/new/page";
import DebtDetailPage from "@/app/app/debts/[accountId]/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
  usePathname: () => "/app",
  useParams: () => ({ accountId: "7" }),
}));

function mockFetch(routes: Record<string, unknown>) {
  return vi.spyOn(global, "fetch").mockImplementation((input) => {
    const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
    for (const [fragment, body] of Object.entries(routes)) {
      if (url.includes(fragment)) {
        return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
  });
}

function mockAuthenticated(routes: Record<string, unknown> = {}) {
  return mockFetch({ "/api/v1/auth/me": { user: TEST_USER }, "/api/v1/auth/csrf": { csrf_token: "token" }, ...routes });
}

const CARD_DEBT = {
  account_id: 7,
  name: "Visa card",
  account_type: "credit_card",
  currency_code: "COP",
  visibility: "shared",
  archived_at: null,
  posted_balance: "-500.0",
  pending_impact: "-100.0",
  projected_balance: "-600.0",
  debt_balance: "500.0",
  projected_debt_balance: "600.0",
  credit_limit: "2000.0",
  available_credit: "1400.0",
  utilization_percentage: "30.0",
  over_limit_amount: "0.0",
  profile: null,
  paid_off_ratio: null,
};

beforeEach(() => {
  window.localStorage.setItem("dailyloaf.selectedHouseholdId", "1");
});

describe("canonicalizeMoneyInput", () => {
  it("canonicalizes English entry with grouping and decimal separators", () => {
    expect(canonicalizeMoneyInput("500,000", "en-US")).toBe("500000");
    expect(canonicalizeMoneyInput("1,234.56", "en-US")).toBe("1234.56");
    expect(canonicalizeMoneyInput("500000", "en-US")).toBe("500000");
    expect(canonicalizeMoneyInput("-50.25", "en-US")).toBe("-50.25");
  });

  it("canonicalizes Spanish entry with inverted separators", () => {
    expect(canonicalizeMoneyInput("500.000", "es-CO")).toBe("500000");
    expect(canonicalizeMoneyInput("100,50", "es-CO")).toBe("100.50");
    expect(canonicalizeMoneyInput("1.234,56", "es-CO")).toBe("1234.56");
  });

  it("treats a single group separator with three fraction digits as grouping", () => {
    expect(canonicalizeMoneyInput("500.000", "es-CO")).toBe("500000");
    expect(canonicalizeMoneyInput("500,000", "en-US")).toBe("500000");
  });

  it("rejects more than four decimal places and non-numeric text", () => {
    expect(canonicalizeMoneyInput("1.12345", "en-US")).toBeNull();
    expect(canonicalizeMoneyInput("abc", "en-US")).toBeNull();
    expect(canonicalizeMoneyInput("", "en-US")).toBeNull();
    expect(canonicalizeMoneyInput("-", "en-US")).toBeNull();
  });
});

describe("formatMoneyEntry", () => {
  it("groups digits per locale and preserves entered decimals", () => {
    expect(formatMoneyEntry("500000", "en-US")).toBe("500,000");
    expect(formatMoneyEntry("500000.5", "en-US")).toBe("500,000.5");
    expect(formatMoneyEntry("500000", "es-CO")).toBe("500.000");
    expect(formatMoneyEntry("1234.56", "es-CO")).toBe("1.234,56");
    expect(formatMoneyEntry("-50000", "en-US")).toBe("-50,000");
  });
});

describe("internal implementation copy", () => {
  it("contains no implementation-oriented phrases in either dictionary", () => {
    for (const locale of ["en", "es"] as const) {
      const flat = flattenMessages(getMessages(locale) as unknown as Record<string, unknown>);
      const all = Object.values(flat).join(" ");
      expect(all).not.toMatch(/rails/i);
      expect(all).not.toMatch(/authoritative|autoritativ/i);
      expect(all).not.toMatch(/database|base de datos/i);
      expect(all).not.toContain("Financial calculations remain authoritative in Rails.");
      expect(all).not.toContain("Los cálculos financieros siguen siendo autoritativos en Rails.");
    }
  });

  it("does not render internal phrases on the landing page in English or Spanish", async () => {
    mockAuthenticated();
    const { unmount } = renderWithProviders(<Home />, "en");
    await waitFor(() => expect(screen.getByText(/income, expenses and debts/)).toBeInTheDocument());
    expect(document.body.textContent).not.toContain("Financial calculations remain authoritative in Rails.");
    unmount();

    renderWithProviders(<Home />, "es");
    await waitFor(() => expect(screen.getByText(/ingresos, gastos y deudas/)).toBeInTheDocument());
    expect(document.body.textContent).not.toContain("Los cálculos financieros siguen siendo autoritativos en Rails.");
  });
});

describe("account creation form", () => {
  it("shows the credit-limit field only for credit-card accounts", async () => {
    mockAuthenticated();
    renderWithProviders(<NewAccountPage />, "en");

    await waitFor(() => expect(screen.getByLabelText("Account type")).toBeInTheDocument());
    expect(screen.queryByLabelText("Total credit limit")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "credit_card" } });
    expect(screen.getByLabelText("Total credit limit")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "loan" } });
    expect(screen.queryByLabelText("Total credit limit")).not.toBeInTheDocument();
  });

  it("labels the opening amount as money owed for liabilities", async () => {
    mockAuthenticated();
    renderWithProviders(<NewAccountPage />, "en");

    await waitFor(() => expect(screen.getByLabelText("Opening balance")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "credit_card" } });
    expect(screen.getByLabelText("Amount currently owed")).toBeInTheDocument();
    expect(screen.getByText(/positive amount/)).toBeInTheDocument();
  });

  it("sends a positive canonical opening amount and credit limit for a card", async () => {
    const fetchMock = mockAuthenticated({ "/accounts": { account: { id: 9 } } });
    renderWithProviders(<NewAccountPage />, "en");

    await waitFor(() => expect(screen.getByLabelText("Account type")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Visa" } });
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "credit_card" } });
    fireEvent.change(screen.getByLabelText("Amount currently owed"), { target: { value: "500000" } });
    fireEvent.change(screen.getByLabelText("Total credit limit"), { target: { value: "2,000,000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input]) => String(input).includes("/accounts") && String((input as Request).method ?? "") === "POST") ??
        fetchMock.mock.calls.find(([input, init]) => String(input).includes("/accounts") && (init as RequestInit | undefined)?.method === "POST");
      expect(call).toBeDefined();
      const body = JSON.parse(String((call![1] as RequestInit).body));
      expect(body.opening_balance).toBe("500000");
      expect(body.credit_limit).toBe("2000000");
      expect(body.opening_balance).not.toMatch(/^-/);
    });
  });

  it("shows the household currency in the money field", async () => {
    mockAuthenticated();
    renderWithProviders(<NewAccountPage />, "en");
    await waitFor(() => expect(screen.getByText("COP")).toBeInTheDocument());
  });
});

describe("debt credit availability", () => {
  const routes = {
    "/accounts": { accounts: [] },
    "/debts/7": { debt: CARD_DEBT },
  };

  it("renders limit, available credit, utilization, and the estimated note in English", async () => {
    mockAuthenticated(routes);
    renderWithProviders(<DebtDetailPage />, "en");

    await waitFor(() => expect(screen.getByText("Total credit limit")).toBeInTheDocument());
    expect(screen.getByText("Available credit")).toBeInTheDocument();
    expect(screen.getByText("Credit utilization")).toBeInTheDocument();
    expect(screen.getByText(/Estimated from recorded transactions/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Credit utilization" })).toHaveAttribute("aria-valuenow", "30");
  });

  it("renders the same labels in Spanish", async () => {
    mockAuthenticated(routes);
    renderWithProviders(<DebtDetailPage />, "es");

    await waitFor(() => expect(screen.getByText("Cupo total")).toBeInTheDocument());
    expect(screen.getByText("Cupo disponible")).toBeInTheDocument();
    expect(screen.getByText("Utilización del cupo")).toBeInTheDocument();
    expect(screen.getByText(/Estimado según los movimientos registrados/)).toBeInTheDocument();
  });

  it("shows the over-limit state with the exceeded amount", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [] },
      "/debts/7": { debt: { ...CARD_DEBT, available_credit: "-100.0", utilization_percentage: "125.0", over_limit_amount: "100.0" } },
    });
    renderWithProviders(<DebtDetailPage />, "en");

    await waitFor(() => expect(screen.getByText(/Over the limit by/)).toBeInTheDocument());
    expect(screen.getByRole("progressbar", { name: "Credit utilization" })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar", { name: "Credit utilization" })).toHaveAttribute("aria-valuetext", "125%");
  });

  it("exposes a labeled edit-card action and saves the credit limit", async () => {
    const fetchMock = mockAuthenticated(routes);
    renderWithProviders(<DebtDetailPage />, "en");

    fireEvent.click(await screen.findByRole("button", { name: "Edit card information" }));
    const limitInput = screen.getByLabelText("Total credit limit");
    fireEvent.change(limitInput, { target: { value: "2500000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).includes("/accounts/7") && (init as RequestInit | undefined)?.method === "PATCH");
      expect(call).toBeDefined();
      expect(JSON.parse(String((call![1] as RequestInit).body))).toMatchObject({ name: "Visa card", credit_limit: "2500000" });
    });
  });

  it("confirms archival with history-preservation copy", async () => {
    mockAuthenticated(routes);
    renderWithProviders(<DebtDetailPage />, "en");

    fireEvent.click(await screen.findByRole("button", { name: "Archive card" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/transactions, transfers and history remain available/);
    expect(within(dialog).getByRole("button", { name: "Archive card" })).toBeInTheDocument();
  });

  it("explains that removing the debt configuration keeps history", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [] },
      "/debts/7": { debt: { ...CARD_DEBT, profile: { id: 1, account_id: 7, creditor_name: null, annual_interest_rate: "0", minimum_payment: "50.0", planned_monthly_payment: null, payment_due_day: null, original_principal: null, opened_on: null, maturity_on: null, notes: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" } } },
    });
    renderWithProviders(<DebtDetailPage />, "en");

    fireEvent.click(await screen.findByRole("button", { name: "Edit debt profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove debt configuration" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(/transaction history remain/);
  });
});
