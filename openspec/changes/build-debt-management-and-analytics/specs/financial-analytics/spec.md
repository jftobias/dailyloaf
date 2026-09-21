# financial-analytics Specification Delta

## ADDED Requirements

### Requirement: Compute deterministic household analytics in Rails

The system SHALL expose `GET /api/v1/households/:household_id/analytics` with
`scope` (shared|private|combined), `from`/`to` ISO dates, and `interval`
(day|week|month). Analysis SHALL use posted records only, exclude transfers
from income and expenses, count reversal rows in their own `occurred_on`
bucket attributed to the reversed record's kind and category, count
replacement transactions normally, handle category-less rows safely, bound
the requested range (5 years / 370 buckets maximum, 422 otherwise), and
return decimal strings with the household currency and time zone. Unauthorized
private records SHALL never affect totals.

#### Scenario: Bucket income and expenses by interval

- **GIVEN** posted income and expense records across several months
- **WHEN** a member requests monthly analytics for a range
- **THEN** each calendar-month bucket reports its income, expenses, and net
  cash flow
- **AND** transfer legs contribute nothing to those totals

#### Scenario: Cancel reversed amounts correctly

- **GIVEN** a posted expense reversed on a later date
- **WHEN** analytics cover both dates
- **THEN** the original counts in its bucket and the reversal reduces the
  expense in its own bucket
- **AND** category breakdowns attribute the reversal to the original category

#### Scenario: Compare with the previous period

- **GIVEN** a requested range of N days
- **WHEN** analytics are returned
- **THEN** summary totals for [from,to] appear alongside totals for the
  immediately preceding N-day window and their deltas

#### Scenario: Enforce privacy scope

- **GIVEN** another member's private account with activity
- **WHEN** analytics are requested in any scope
- **THEN** those records never contribute to any total, series, or breakdown

### Requirement: Reconstruct historical balances deterministically

Balance-bearing series (net worth, assets vs. liabilities, debt trend) SHALL
reconstruct each bucket-end balance as the account's opening balance (only
when the bucket end is on or after `opening_balance_date`) plus the sum of
posted impacts with `occurred_on` on or before the bucket end. Net worth SHALL
equal the sum of all in-scope account balances; liabilities and debt SHALL be
presented as positive amounts. The implementation SHALL use grouped aggregate
queries without per-account or per-bucket query fan-out.

#### Scenario: Trend net worth over time

- **GIVEN** accounts with opening balances and posted activity
- **WHEN** analytics return a time series
- **THEN** each bucket reports assets, liabilities, net worth, and debt
  consistent with `posted_balance` semantics at that bucket end

### Requirement: Render an accessible localized analysis page

The UI SHALL add `/app/analysis` and an Analysis/Análisis navigation entry —
not a separate Charts destination — with a date-range filter, privacy-scope
filter, period comparison cards, and charts for net-worth trend, income vs.
expenses, net cash flow, spending by category, and debt trend when debt data
exists. Charts SHALL be responsive without horizontal overflow down to 375 px,
use the existing palette, localize labels/tooltips/legends with `es-CO` and
`en-US` formatting, show empty states rather than meaningless zero charts,
avoid animation under reduced-motion preferences, and provide an accessible
textual or tabular alternative for important data. Color SHALL NOT be the
only channel conveying information. Decimal strings SHALL remain
authoritative; conversion to numbers is permitted only at the visualization
boundary.

#### Scenario: Inspect analysis in Spanish on mobile

- **GIVEN** a member using the `es` locale at 375 px width
- **WHEN** the member opens `/app/analysis`
- **THEN** filters, cards, chart titles, legends, and empty states render in
  Spanish with `es-CO` number and date formatting
- **AND** the document shows no horizontal overflow

#### Scenario: Provide a table alternative for a chart

- **GIVEN** an income-vs-expenses chart with data
- **WHEN** a keyboard or screen-reader user inspects it
- **THEN** an accessible data table or textual summary exposes the same values
