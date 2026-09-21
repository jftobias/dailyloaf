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
};

export type Transfer = {
  id: number;
  source_account_id: number;
  destination_account_id: number;
  amount: string;
  currency_code: string;
  status: "pending" | "posted";
  reversal_of_id: number | null;
  transaction_ids: number[];
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
export const createTransaction = (householdId: number, input: Record<string, unknown>, idempotencyKey: string) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, "transactions"), { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
export const updateTransaction = (householdId: number, id: number, input: Record<string, unknown>) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, `transactions/${id}`), { method: "PATCH", body: JSON.stringify(input) });
export const postTransaction = (householdId: number, id: number) => apiRequest<{ transaction: FinancialTransaction }>(householdPath(householdId, `transactions/${id}/post`), { method: "POST" });
export const reverseTransaction = (householdId: number, id: number) => apiRequest<{ reversal: FinancialTransaction }>(householdPath(householdId, `transactions/${id}/reverse`), { method: "POST" });

export const listTransfers = (householdId: number) => apiRequest<{ transfers: Transfer[] }>(householdPath(householdId, "transfers"));
export const createTransfer = (householdId: number, input: Record<string, unknown>, idempotencyKey: string) => apiRequest<{ transfer: Transfer }>(householdPath(householdId, "transfers"), { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) });
export const reverseTransfer = (householdId: number, id: number) => apiRequest<{ reversal: Transfer }>(householdPath(householdId, `transfers/${id}/reverse`), { method: "POST" });

export const getOverview = (householdId: number, scope: Overview["scope"], from: string, to: string) => apiRequest<{ overview: Overview }>(`${householdPath(householdId, "overview")}?scope=${scope}&from=${from}&to=${to}`);
