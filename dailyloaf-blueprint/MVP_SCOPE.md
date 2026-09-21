# DailyLoaf MVP scope

## Product goal

Give a household one reliable place to record transactions, understand the
current month, follow budgets and savings goals, and request a plain-language
AI explanation of figures already calculated by the backend.

## MVP user journey

1. A user signs in and accesses a household.
2. The user creates financial accounts and categories.
3. The user records income and expense transactions.
4. The overview displays income, expenses, net cash flow, savings rate, budget
   progress, primary-goal progress, recent transactions, and a six-month trend.
5. The user requests AI analysis of the calculated monthly snapshot.
6. The application returns structured observations, warnings, opportunities,
   and suggested actions without allowing AI to alter financial totals.

## Core domain

- `User`
- `Household`
- `HouseholdMember`
- `Account`
- `Category`
- `Transaction`
- `Budget`
- `BudgetCategory`
- `FinancialGoal`
- `GoalContribution`
- `FinancialSnapshot`
- `AiAnalysis`

## Required behavior

### Household access

- Every account, transaction, budget, goal, snapshot, and analysis belongs to a household.
- Every API endpoint verifies household membership server-side.
- A user must never access records from another household by changing an identifier.

### Money

- PostgreSQL monetary columns use `decimal(14,2)` or an explicitly documented equivalent.
- Floats are prohibited for stored money and authoritative calculations.
- The household stores its currency; the initial supported currency is COP.

### Transactions

- A member can create income and expense transactions.
- Required fields: account, type, amount, transaction date, and description.
- Category is required for expenses and optional for income.
- Recent transactions are ordered by transaction date and creation time.

### Monthly overview

- Rails calculates total income, total expenses, net cash flow, and savings rate.
- Rails returns six months of chart-ready totals.
- Rails returns budget consumption and financial-goal progress.
- The browser formats and renders values but does not aggregate authoritative totals.

### Budgets

- A household admin can set a monthly limit by expense category.
- Progress states are normal below 80%, warning from 80% through 99.99%, and exceeded at 100% or more.

### Goals

- A household admin can create a target amount and record contributions.
- Progress is calculated from persisted contributions.

### AI analysis

- Analysis runs only after an explicit user request.
- Rails sends a compact calculated snapshot, not unrestricted raw transaction history.
- The model response must follow a JSON schema containing `summary`, `health`,
  `observations`, `warnings`, `opportunities`, and `suggested_actions`.
- AI output is advisory and never overwrites balances, transactions, budgets, or goals.

## Out of scope for the first MVP

- Bank connections and automatic synchronization
- Multiple currencies inside one household
- Investments and portfolio tracking
- Credit scoring
- Bill payment
- Tax advice
- Automated financial transactions
- Native mobile applications

## Quality gates

- RSpec coverage for every calculation and authorization boundary
- Request specs for household-scoped endpoints
- Frontend type checking and linting
- Browser coverage for recording a transaction and reading the overview
- OpenSpec verification before the implementation pull request is opened
