export type Household = {
  id: number;
  name: string;
  currency_code: string;
  time_zone?: string;
  role: "owner" | "member";
};

export type User = {
  id: number;
  email: string;
  households: Household[];
};

export type Account = {
  id: number;
  name: string;
  account_type: "cash" | "checking" | "savings" | "credit_card" | "loan" | "investment" | "other_asset" | "other_liability";
  currency_code: string;
  opening_balance: string;
  opening_balance_date: string;
  visibility: "shared" | "private";
  private_owner_id: number | null;
  archived_at: string | null;
  posted_balance: string;
  pending_impact: string;
  projected_balance: string;
};

export type Category = {
  id: number;
  name: string;
  kind: "income" | "expense";
  visibility: "shared" | "private";
  private_owner_id: number | null;
  is_default: boolean;
  archived_at: string | null;
};

export type FinancialTransaction = {
  id: number;
  account_id: number;
  category_id: number | null;
  transfer_id: number | null;
  kind: "income" | "expense" | "transfer" | "balance_adjustment";
  account_impact: string;
  status: "pending" | "posted";
  occurred_on: string;
  description: string;
  notes: string | null;
  reversal_of_id: number | null;
  replacement_for_id: number | null;
  reversal_id: number | null;
  replacement_id: number | null;
  created_at: string;
  updated_at: string;
};

export type Transfer = {
  id: number;
  source_account_id: number;
  destination_account_id: number;
  amount: string;
  currency_code: string;
  status: "pending" | "posted";
  reversal_of_id: number | null;
  reversed: boolean;
  transaction_ids: number[];
  created_at: string;
  updated_at: string;
};

export type DebtProfile = {
  id: number;
  account_id: number;
  creditor_name: string | null;
  annual_interest_rate: string;
  minimum_payment: string;
  planned_monthly_payment: string | null;
  payment_due_day: number | null;
  original_principal: string | null;
  opened_on: string | null;
  maturity_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Debt = {
  account_id: number;
  name: string;
  account_type: Account["account_type"];
  currency_code: string;
  visibility: "shared" | "private";
  archived_at: string | null;
  posted_balance: string;
  pending_impact: string;
  projected_balance: string;
  debt_balance: string;
  projected_debt_balance: string;
  profile: DebtProfile | null;
  paid_off_ratio: string | null;
  estimated_payoff_date?: string | null;
  estimated_months?: number | null;
  amortizing?: boolean;
};

export type DebtProjection = {
  current_balance: string;
  assumed_monthly_payment: string;
  annual_interest_rate: string;
  months: number | null;
  payoff_date: string | null;
  total_interest: string | null;
  total_paid: string | null;
  amortizing: boolean;
  horizon_months: number;
};

export type AnalyticsScope = "shared" | "private" | "combined";
export type AnalyticsInterval = "day" | "week" | "month";

export type AnalyticsBucket = {
  start: string;
  end: string;
  income: string;
  expenses: string;
  net_cash_flow: string;
  assets: string;
  liabilities: string;
  net_worth: string;
  debt: string;
};

export type AnalyticsBreakdownEntry = {
  category_id: number;
  name: string;
  kind: "income" | "expense";
  is_default: boolean;
  visibility: "shared" | "private";
  total: string;
};

export type DebtSeriesEntry = {
  account_id: number;
  account_name: string;
  has_profile: boolean;
  points: { date: string; balance: string }[];
};

export type Analytics = {
  scope: AnalyticsScope;
  interval: AnalyticsInterval;
  from: string;
  to: string;
  currency_code: string;
  time_zone: string;
  summary: { income: string; expenses: string; net_cash_flow: string };
  previous_period: { from: string; to: string; income: string; expenses: string; net_cash_flow: string };
  comparison: { income_change: string; expenses_change: string; net_cash_flow_change: string };
  series: AnalyticsBucket[];
  income_breakdown: AnalyticsBreakdownEntry[];
  expense_breakdown: AnalyticsBreakdownEntry[];
  debt_series: DebtSeriesEntry[];
};

export type Overview = {
  scope: "shared" | "private" | "combined";
  from: string;
  to: string;
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  income: string;
  expenses: string;
  cash_flow: string;
  account_balances: Record<string, string>;
  category_totals: Record<string, string>;
};

type RailsErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
let csrfToken: string | null = null;

const stateChangingMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function isStateChanging(method: string) {
  return stateChangingMethods.has(method.toUpperCase());
}

async function parseResponse<T>(response: Response): Promise<T | undefined> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

async function errorFromResponse(response: Response) {
  const body = await parseResponse<RailsErrorBody>(response);
  const railsError = body?.error;

  return new ApiError(
    response.status,
    railsError?.code ?? "request_failed",
    railsError?.message ?? "The request could not be completed.",
    railsError?.details,
  );
}

export async function getCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken;

  const response = await fetch(`${apiBaseUrl}/api/v1/auth/csrf`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await errorFromResponse(response);

  const body = await parseResponse<{ csrf_token: string }>(response);
  if (!body?.csrf_token) {
    throw new ApiError(response.status, "invalid_csrf_response", "The API returned no CSRF token.");
  }

  csrfToken = body.csrf_token;
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = null;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T | undefined> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (isStateChanging(method) && !headers.has("X-CSRF-Token")) headers.set("X-CSRF-Token", await getCsrfToken());

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, method, headers, credentials: "include" });
  if (response.ok) return parseResponse<T>(response);

  const error = await errorFromResponse(response);
  if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("dailyloaf:unauthorized"));
  if (isStateChanging(method) && !retried && error.code === "invalid_csrf_token") {
    clearCsrfToken();
    const retryHeaders = new Headers(init.headers);
    retryHeaders.delete("X-CSRF-Token");
    return apiRequest<T>(path, { ...init, headers: retryHeaders }, true);
  }

  throw error;
}

export async function getCurrentUser() {
  try {
    const body = await apiRequest<{ user: User }>("/api/v1/auth/me");
    return body?.user ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function register(input: { email: string; password: string; household_name: string; currency_code: string }) {
  const body = await apiRequest<{ user: User; household: Household }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) });
  return body as { user: User; household: Household };
}

export async function login(input: { email: string; password: string }) {
  const body = await apiRequest<{ user: User }>("/api/v1/auth/session", { method: "POST", body: JSON.stringify(input) });
  return body?.user as User;
}

export async function logout() {
  await apiRequest<void>("/api/v1/auth/session", { method: "DELETE" });
  clearCsrfToken();
}

function householdPath(householdId: number, resource: string) {
  return `/api/v1/households/${householdId}/${resource}`;
}

export const listAccounts = (householdId: number) => apiRequest<{ accounts: Account[] }>(householdPath(householdId, "accounts"));
export const getAccount = (householdId: number, id: number) => apiRequest<{ account: Account }>(householdPath(householdId, `accounts/${id}`));
export const createAccount = (householdId: number, input: Record<string, unknown>, idempotencyKey?: string) => apiRequest<{ account: Account }>(householdPath(householdId, "accounts"), { method: "POST", headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined, body: JSON.stringify(input) });
export const archiveAccount = (householdId: number, id: number) => apiRequest<void>(householdPath(householdId, `accounts/${id}/archive`), { method: "POST" });

export const listCategories = (householdId: number) => apiRequest<{ categories: Category[] }>(householdPath(householdId, "categories"));
export const createCategory = (householdId: number, input: Record<string, unknown>) => apiRequest<{ category: Category }>(householdPath(householdId, "categories"), { method: "POST", body: JSON.stringify(input) });
export const archiveCategory = (householdId: number, id: number) => apiRequest<void>(householdPath(householdId, `categories/${id}/archive`), { method: "POST" });

export const listTransactions = (householdId: number) => apiRequest<{ transactions: FinancialTransaction[] }>(householdPath(householdId, "transactions"));
export const getTransaction = (householdId: number, id: number) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, `transactions/${id}`));
export const deleteTransaction = (householdId: number, id: number) => apiRequest<{ reversal?: FinancialTransaction } | void>(householdPath(householdId, `transactions/${id}`), { method: "DELETE" });
export const createTransaction = (householdId: number, input: Record<string, unknown>, idempotencyKey: string) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, "transactions"), { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
export type TransactionUpdateResponse = { transaction: FinancialTransaction } | { reversal: FinancialTransaction; replacement: FinancialTransaction };
export const updateTransaction = (householdId: number, id: number, input: Record<string, unknown>) => apiRequest<TransactionUpdateResponse>(householdPath(householdId, `transactions/${id}`), { method: "PATCH", body: JSON.stringify(input) });
export const postTransaction = (householdId: number, id: number) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, `transactions/${id}/post`), { method: "POST" });
export const reverseTransaction = (householdId: number, id: number) => apiRequest<{ reversal: FinancialTransaction }>(householdPath(householdId, `transactions/${id}/reverse`), { method: "POST" });

export const listTransfers = (householdId: number) => apiRequest<{ transfers: Transfer[] }>(householdPath(householdId, "transfers"));
export const getTransfer = (householdId: number, id: number) => apiRequest<{ transfer: Transfer }>(householdPath(householdId, `transfers/${id}`));
export const updateTransfer = (householdId: number, id: number, input: Record<string, unknown>) => apiRequest<{ transfer: Transfer }>(householdPath(householdId, `transfers/${id}`), { method: "PATCH", body: JSON.stringify(input) });
export const createTransfer = (householdId: number, input: Record<string, unknown>, idempotencyKey: string) => apiRequest<{ transfer: Transfer }>(householdPath(householdId, "transfers"), { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
export const reverseTransfer = (householdId: number, id: number) => apiRequest<{ reversal: Transfer }>(householdPath(householdId, `transfers/${id}/reverse`), { method: "POST" });

export const getOverview = (householdId: number, scope: Overview["scope"], from: string, to: string) => apiRequest<{ overview: Overview }>(`${householdPath(householdId, "overview")}?scope=${scope}&from=${from}&to=${to}`);

export const listDebts = (householdId: number) => apiRequest<{ debts: Debt[] }>(householdPath(householdId, "debts"));
export const getDebt = (householdId: number, accountId: number) => apiRequest<{ debt: Debt }>(householdPath(householdId, `debts/${accountId}`));
export const getDebtProjection = (householdId: number, accountId: number) => apiRequest<{ projection: DebtProjection }>(householdPath(householdId, `debts/${accountId}/projection`));
export const createDebtProfile = (householdId: number, accountId: number, input: Record<string, unknown>) => apiRequest<{ debt_profile: DebtProfile }>(householdPath(householdId, `accounts/${accountId}/debt_profile`), { method: "POST", body: JSON.stringify(input) });
export const updateDebtProfile = (householdId: number, accountId: number, input: Record<string, unknown>) => apiRequest<{ debt_profile: DebtProfile }>(householdPath(householdId, `accounts/${accountId}/debt_profile`), { method: "PATCH", body: JSON.stringify(input) });
export const deleteDebtProfile = (householdId: number, accountId: number) => apiRequest<void>(householdPath(householdId, `accounts/${accountId}/debt_profile`), { method: "DELETE" });

export const getAnalytics = (householdId: number, params: { scope: AnalyticsScope; from: string; to: string; interval: AnalyticsInterval }) =>
  apiRequest<{ analytics: Analytics }>(`${householdPath(householdId, "analytics")}?scope=${params.scope}&from=${params.from}&to=${params.to}&interval=${params.interval}`);
