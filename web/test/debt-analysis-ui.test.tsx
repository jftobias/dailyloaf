import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, TEST_USER } from "./helpers";
import DebtsPage from "@/app/app/debts/page";
import DebtDetailPage from "@/app/app/debts/[accountId]/page";
import AnalysisPage from "@/app/app/analysis/page";
import TransactionDetailPage from "@/app/app/transactions/[transactionId]/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/debts",
  useParams: () => ({ accountId: "7", transactionId: "272" }),
}));

const DEBT = {
  account_id: 7,
  name: "Visa card",
  account_type: "credit_card",
  currency_code: "COP",
  visibility: "shared",
  archived_at: null,
  posted_balance: "-500.0",
  pending_impact: "0.0",
  projected_balance: "-500.0",
  debt_balance: "500.0",
  projected_debt_balance: "500.0",
  credit_limit: "2000.0",
  available_credit: "1500.0",
  utilization_percentage: "25.0",
  over_limit_amount: "0.0",
  profile: {
    id: 1,
    account_id: 7,
    creditor_name: "Bank",
    annual_interest_rate: "24.5",
    minimum_payment: "50.0",
    planned_monthly_payment: "100.0",
    payment_due_day: 15,
    original_principal: "800.0",
    opened_on: null,
    maturity_on: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  paid_off_ratio: "0.375",
  estimated_payoff_date: "2026-06-21",
  estimated_months: 5,
  amortizing: true,
};

const PROJECTION = {
  current_balance: "500.0",
  assumed_monthly_payment: "100.0",
  annual_interest_rate: "24.5",
  months: 6,
  payoff_date: "2026-07-21",
  total_interest: "56.1234",
  total_paid: "556.1234",
  amortizing: true,
  horizon_months: 600,
};

const ASSET_ACCOUNT = {
  id: 2,
  name: "Checking",
  account_type: "checking",
  currency_code: "COP",
  opening_balance: "1000.0",
  opening_balance_date: "2026-01-01",
  visibility: "shared",
  private_owner_id: null,
  archived_at: null,
  credit_limit: null,
  posted_balance: "1000.0",
  pending_impact: "0.0",
  projected_balance: "1000.0",
};

const ANALYTICS = {
  scope: "combined",
  interval: "month",
  from: "2026-01-01",
  to: "2026-01-31",
  currency_code: "COP",
  time_zone: "America/Bogota",
  summary: { income: "500.0", expenses: "200.0", net_cash_flow: "300.0" },
  previous_period: { from: "2025-12-01", to: "2025-12-31", income: "400.0", expenses: "150.0", net_cash_flow: "250.0" },
  comparison: { income_change: "100.0", expenses_change: "50.0", net_cash_flow_change: "50.0" },
  series: [
    { start: "2026-01-01", end: "2026-01-31", income: "500.0", expenses: "200.0", net_cash_flow: "300.0", assets: "1500.0", liabilities: "500.0", net_worth: "1000.0", debt: "500.0" },
  ],
  income_breakdown: [ { category_id: 1, name: "Salary", kind: "income", is_default: true, visibility: "shared", total: "500.0" } ],
  expense_breakdown: [ { category_id: 16, name: "Fees", kind: "expense", is_default: true, visibility: "shared", total: "200.0" } ],
  debt_series: [
    { account_id: 7, account_name: "Visa card", has_profile: true, points: [ { date: "2026-01-31", balance: "500.0" } ] },
  ],
};

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

beforeEach(() => {
  window.localStorage.setItem("dailyloaf.selectedHouseholdId", "1");
});

describe("debts list", () => {
  it("renders debts in English with formatted balances and profile data", async () => {
    mockAuthenticated({ "/debts": { debts: [DEBT] } });
    renderWithProviders(<DebtsPage />, "en");

    await waitFor(() => expect(screen.getByText("Visa card")).toBeInTheDocument());
    expect(screen.getByText(/Bank/)).toBeInTheDocument();
    expect(screen.getByText("Minimum payment")).toBeInTheDocument();
    expect(screen.getByText("Interest rate")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "38");
  });

  it("renders debts in Spanish", async () => {
    mockAuthenticated({ "/debts": { debts: [DEBT] } });
    renderWithProviders(<DebtsPage />, "es");

    await waitFor(() => expect(screen.getByText("Pago mínimo")).toBeInTheDocument());
    expect(screen.getByText("Tasa de interés")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deudas" })).toBeInTheDocument();
  });

  it("shows the localized empty state", async () => {
    mockAuthenticated({ "/debts": { debts: [] } });
    renderWithProviders(<DebtsPage />, "es");

    await waitFor(() => expect(screen.getByText("Aún no hay deudas")).toBeInTheDocument());
  });
});

describe("debt detail", () => {
  it("renders profile, projection, and payment form", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [ASSET_ACCOUNT] },
      "/debts/7/projection": { projection: PROJECTION },
      "/debts/7": { debt: DEBT },
    });
    renderWithProviders(<DebtDetailPage />, "en");

    await waitFor(() => expect(screen.getByText("Payoff estimate")).toBeInTheDocument());
    expect(screen.getByText("Total estimated interest")).toBeInTheDocument();
    expect(screen.getByText("Pay this debt")).toBeInTheDocument();
  });

  it("formats projection amounts with currency precision, not raw 4-decimal strings", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [ASSET_ACCOUNT] },
      "/debts/7/projection": { projection: PROJECTION },
      "/debts/7": { debt: DEBT },
    });
    renderWithProviders(<DebtDetailPage />, "en");

    await waitFor(() => expect(screen.getByText("Total estimated interest")).toBeInTheDocument());
    const interest = screen.getByText("Total estimated interest").nextElementSibling?.textContent ?? "";
    const paid = screen.getByText("Total estimated paid").nextElementSibling?.textContent ?? "";
    expect(interest.replace(/\s/g, " ")).toMatch(/COP 56/);
    expect(paid.replace(/\s/g, " ")).toMatch(/COP 556/);
    expect(document.body.textContent).not.toContain("56.1234");
    expect(document.body.textContent).not.toContain("556.1234");
  });

  it("formats projection amounts with currency precision in Spanish", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [ASSET_ACCOUNT] },
      "/debts/7/projection": { projection: PROJECTION },
      "/debts/7": { debt: DEBT },
    });
    renderWithProviders(<DebtDetailPage />, "es");

    await waitFor(() => expect(screen.getByText("Intereses totales estimados")).toBeInTheDocument());
    const interest = screen.getByText("Intereses totales estimados").nextElementSibling?.textContent ?? "";
    expect(interest.replace(/\s/g, " ")).toMatch(/\$ ?56/);
    expect(document.body.textContent).not.toContain("56,1234");
  });

  it("validates the profile form with localized messages", async () => {
    mockAuthenticated({
      "/accounts": { accounts: [] },
      "/debts/7": { debt: { ...DEBT, profile: null, paid_off_ratio: null } },
    });
    renderWithProviders(<DebtDetailPage />, "es");

    await waitFor(() => expect(screen.getByText("Configurar perfil de deuda")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Configurar perfil de deuda"));
    fireEvent.change(screen.getByLabelText("Pago mínimo"), { target: { value: "-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar perfil de deuda" }));

    await waitFor(() => expect(screen.getByText("Ingresa un pago mínimo (0 o más).")).toBeInTheDocument());
  });

  it("pays the debt through a transfer with an idempotency key", async () => {
    const fetchMock = mockAuthenticated({
      "/accounts": { accounts: [ASSET_ACCOUNT] },
      "/debts/7/projection": { projection: PROJECTION },
      "/debts/7": { debt: DEBT },
      "/transfers": { transfer: { id: 9 } },
    });
    renderWithProviders(<DebtDetailPage />, "en");

    await waitFor(() => expect(screen.getByText("Pay this debt")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("From account"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));

    await waitFor(() => expect(screen.getByText("Payment recorded.")).toBeInTheDocument());
    const transferCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/transfers"));
    expect(transferCall).toBeDefined();
    const init = transferCall![1] as RequestInit;
    expect(new Headers(init.headers).get("Idempotency-Key")).toBeTruthy();
    expect(JSON.parse(String(init.body))).toMatchObject({ source_account_id: 2, destination_account_id: 7, amount: "100" });
  });
});

describe("analysis page", () => {
  it("renders summary cards, chart titles, and accessible tables in English", async () => {
    mockAuthenticated({ "/analytics": { analytics: ANALYTICS } });
    renderWithProviders(<AnalysisPage />, "en");

    await waitFor(() => expect(screen.getByText("Net-worth trend")).toBeInTheDocument());
    expect(screen.getByText("Income vs. expenses")).toBeInTheDocument();
    expect(screen.getByText("Spending by category")).toBeInTheDocument();
    expect(screen.getByText("Debt trend")).toBeInTheDocument();
    expect(screen.getAllByText("Show data table").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0);
  });

  it("renders localized analysis in Spanish", async () => {
    mockAuthenticated({ "/analytics": { analytics: ANALYTICS } });
    renderWithProviders(<AnalysisPage />, "es");

    await waitFor(() => expect(screen.getByText("Evolución del patrimonio neto")).toBeInTheDocument());
    expect(screen.getByText("Ingresos frente a gastos")).toBeInTheDocument();
    expect(screen.getByText("Gastos por categoría")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Análisis" })).toBeInTheDocument();
  });

  it("sends the selected privacy scope to the API", async () => {
    const fetchMock = mockAuthenticated({ "/analytics": { analytics: ANALYTICS } });
    renderWithProviders(<AnalysisPage />, "en");

    await waitFor(() => expect(screen.getByText("Net-worth trend")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("View scope"), { target: { value: "private" } });

    await waitFor(() => {
      const calls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(calls.some((url) => url.includes("scope=private"))).toBe(true);
    });
  });

  it("shows empty chart states when no data exists", async () => {
    mockAuthenticated({
      "/analytics": { analytics: { ...ANALYTICS, series: [ { ...ANALYTICS.series[0], income: "0.0", expenses: "0.0", assets: "0.0", liabilities: "0.0", net_worth: "0.0", debt: "0.0" } ], expense_breakdown: [], debt_series: [] } },
    });
    renderWithProviders(<AnalysisPage />, "en");

    await waitFor(() => expect(screen.getAllByText("No data for this period yet.").length).toBeGreaterThan(0));
    expect(screen.queryByText("Debt trend")).not.toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("includes debts and analysis links", async () => {
    mockAuthenticated({ "/debts": { debts: [] } });
    renderWithProviders(<DebtsPage />, "en");
    await waitFor(() => expect(screen.getByRole("link", { name: "Debts" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Analysis" })).toBeInTheDocument();
  });

  it("includes localized navigation links in Spanish", async () => {
    mockAuthenticated({ "/debts": { debts: [] } });
    renderWithProviders(<DebtsPage />, "es");
    await waitFor(() => expect(screen.getByRole("link", { name: "Deudas" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Análisis" })).toBeInTheDocument();
  });
});

describe("transfer leg detail", () => {
  const LEG = {
    id: 272,
    account_id: 2,
    category_id: null,
    transfer_id: 61,
    kind: "transfer",
    account_impact: "-100.0",
    status: "posted",
    occurred_on: "2026-09-21",
    description: "Transfer to Visa",
    notes: null,
    created_at: "2026-09-21T00:00:00Z",
    updated_at: "2026-09-21T00:00:00Z",
    reversal_of_id: null,
    replacement_for_id: null,
    reversal_id: null,
    replacement_id: null,
  };

  it("hides mutation controls and links to the transfer aggregate", async () => {
    mockAuthenticated({
      "/accounts/2": { account: ASSET_ACCOUNT },
      "/transactions/272": { transaction: LEG },
      "/categories": { categories: [] },
    });
    renderWithProviders(<TransactionDetailPage />, "en");

    const link = await screen.findByRole("link", { name: "View transfer" });
    expect(link).toHaveAttribute("href", "/app/transfers/61");
    expect(screen.getByText(/one account effect of a transfer/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Correct posted record" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete pending" })).not.toBeInTheDocument();
  });

  it("shows the same read-only behavior for a pending leg in Spanish", async () => {
    mockAuthenticated({
      "/accounts/2": { account: ASSET_ACCOUNT },
      "/transactions/272": { transaction: { ...LEG, status: "pending" } },
      "/categories": { categories: [] },
    });
    renderWithProviders(<TransactionDetailPage />, "es");

    await waitFor(() => expect(screen.getByRole("link", { name: "Ver transferencia" })).toBeInTheDocument());
    expect(screen.queryByLabelText("Descripción")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Contabilizar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reversar" })).not.toBeInTheDocument();
  });
});
