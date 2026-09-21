"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthLoading, useRequireAuth } from "@/components/route-guards";
import { useT } from "@/components/locale-provider";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { FinancialShell, useSelectedHousehold } from "@/components/financial/financial-shell";
import { ChartFrame } from "@/components/charts/chart-frame";
import { FormField } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/select-field";
import { getAnalytics, type Analytics, type AnalyticsInterval, type AnalyticsScope } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/form-errors";
import { categoryLabel } from "@/lib/i18n/presentation";

const CHART_COLORS = {
  teal: "#0f4c4c",
  gold: "#b0802f",
  red: "#8c3028",
  gray: "#5d716b",
  sage: "#9dbfae",
};

function currentMonthRange() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export default function AnalysisPage() {
  const auth = useRequireAuth();
  const { selected } = useSelectedHousehold();
  const t = useT();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion;

  const initial = currentMonthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [scope, setScope] = useState<AnalyticsScope>("combined");
  const [interval, setInterval] = useState<AnalyticsInterval>("month");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  const invalidRange = Boolean(from && to && from > to);

  useEffect(() => {
    if (!selected || !from || !to || from > to) return;
    getAnalytics(selected.id, { scope, from, to, interval })
      .then((response) => { setAnalytics(response?.analytics ?? null); setError(""); })
      .catch((requestError) => setError(apiErrorMessage(requestError, t)));
  }, [selected, from, to, scope, interval, t]);

  if (auth.status === "loading" || auth.status === "unauthenticated") return <AuthLoading />;

  const currency = analytics?.currency_code ?? selected?.currency_code ?? "COP";
  const timeZone = analytics?.time_zone ?? selected?.time_zone;

  // Decimal strings stay authoritative; conversion to Number happens only
  // here, at the visualization boundary, for chart coordinates.
  const seriesData = (analytics?.series ?? []).map((bucket) => ({
    label: fmt.date(bucket.start, timeZone),
    income: Number(bucket.income),
    expenses: Number(bucket.expenses),
    netCashFlow: Number(bucket.net_cash_flow),
    assets: Number(bucket.assets),
    liabilities: Number(bucket.liabilities),
    netWorth: Number(bucket.net_worth),
    debt: Number(bucket.debt),
    raw: bucket,
  }));
  const hasFlow = seriesData.some((bucket) => bucket.income !== 0 || bucket.expenses !== 0);
  const hasNetWorth = seriesData.some((bucket) => bucket.netWorth !== 0 || bucket.assets !== 0 || bucket.liabilities !== 0);
  const hasDebt = (analytics?.debt_series ?? []).length > 0;

  const moneyTick = (value: number) => fmt.money(String(value), currency);
  const tooltipFormatter = (value: unknown) => fmt.money(String(value), currency);

  const periodTable = (columns: string[], pick: (bucket: (typeof seriesData)[number]) => (string | number)[]) => ({
    columns: [t("analysis.tablePeriod"), ...columns],
    rows: seriesData.map((bucket) => [ `${bucket.raw.start} – ${bucket.raw.end}`, ...pick(bucket) ]),
  });

  return (
    <FinancialShell title={t("analysis.title")}>
      <Panel className="mb-6">
        <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-4">
          <FormField id="analysis-from" label={t("analysis.from")} type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={t("analysis.fromAria")} />
          <FormField id="analysis-to" label={t("analysis.to")} type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={t("analysis.toAria")} />
          <SelectField id="analysis-scope" label={t("scope.label")} value={scope} onChange={(event) => setScope(event.target.value as AnalyticsScope)}>
            <option value="shared">{t("scope.shared")}</option>
            <option value="private">{t("scope.private")}</option>
            <option value="combined">{t("scope.combined")}</option>
          </SelectField>
          <SelectField id="analysis-interval" label={t("analysis.interval")} value={interval} onChange={(event) => setInterval(event.target.value as AnalyticsInterval)}>
            <option value="day">{t("analysis.intervalDay")}</option>
            <option value="week">{t("analysis.intervalWeek")}</option>
            <option value="month">{t("analysis.intervalMonth")}</option>
          </SelectField>
        </div>
      </Panel>

      <Alert message={invalidRange ? t("analysis.invalidRange") : error} className="mb-6" />

      {analytics && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {([
              [t("analysis.incomeLabel"), analytics.summary.income, analytics.comparison.income_change],
              [t("analysis.expensesLabel"), analytics.summary.expenses, analytics.comparison.expenses_change],
              [t("analysis.netCashFlowLabel"), analytics.summary.net_cash_flow, analytics.comparison.net_cash_flow_change],
            ] as const).map(([label, total, change]) => (
              <Panel key={label}>
                <p className="text-sm font-semibold text-[#5d716b]">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{fmt.money(total, currency)}</p>
                <p className="mt-1 text-xs text-[#5d716b]">
                  {t("analysis.changeFromPrevious")}: {Number(change) >= 0 ? "+" : ""}{fmt.money(change, currency)}
                </p>
              </Panel>
            ))}
          </div>

          <ChartFrame
            title={t("analysis.netWorthTrend")}
            empty={!hasNetWorth}
            emptyText={t("analysis.emptyChart")}
            table={periodTable([t("analysis.assets"), t("analysis.liabilities"), t("analysis.netWorth")], (bucket) => [moneyTick(bucket.assets), moneyTick(bucket.liabilities), moneyTick(bucket.netWorth)])}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee7da" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={moneyTick} width={90} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Line name={t("analysis.assets")} type="monotone" dataKey="assets" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} isAnimationActive={animate} />
                <Line name={t("analysis.liabilities")} type="monotone" dataKey="liabilities" stroke={CHART_COLORS.red} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={animate} />
                <Line name={t("analysis.netWorth")} type="monotone" dataKey="netWorth" stroke={CHART_COLORS.gold} strokeWidth={3} dot={false} isAnimationActive={animate} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            title={t("analysis.incomeVsExpenses")}
            empty={!hasFlow}
            emptyText={t("analysis.emptyChart")}
            table={periodTable([t("analysis.income"), t("analysis.expenses")], (bucket) => [moneyTick(bucket.income), moneyTick(bucket.expenses)])}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee7da" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={moneyTick} width={90} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar name={t("analysis.income")} dataKey="income" fill={CHART_COLORS.teal} isAnimationActive={animate} />
                <Bar name={t("analysis.expenses")} dataKey="expenses" fill={CHART_COLORS.red} isAnimationActive={animate} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            title={t("analysis.netCashFlowTrend")}
            empty={!hasFlow}
            emptyText={t("analysis.emptyChart")}
            table={periodTable([t("analysis.netCashFlow")], (bucket) => [moneyTick(bucket.netCashFlow)])}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee7da" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={moneyTick} width={90} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend />
                <Bar name={t("analysis.netCashFlow")} dataKey="netCashFlow" fill={CHART_COLORS.gold} isAnimationActive={animate} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <ChartFrame
            title={t("analysis.spendingByCategory")}
            empty={analytics.expense_breakdown.length === 0}
            emptyText={t("analysis.emptyChart")}
            table={{
              columns: [t("analysis.tableCategory"), t("analysis.tableAmount")],
              rows: analytics.expense_breakdown.map((entry) => [categoryLabel(entry, t), fmt.money(entry.total, currency)]),
            }}
          >
            <ul className="space-y-3">
              {(() => {
                const max = Math.max(...analytics.expense_breakdown.map((entry) => Number(entry.total)), 1);
                return analytics.expense_breakdown.map((entry, index) => {
                  const amount = Number(entry.total);
                  const percent = Math.max(0, Math.round((amount / max) * 100));
                  return (
                    <li key={entry.category_id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{categoryLabel(entry, t)}</span>
                        <span className="font-semibold">{fmt.money(entry.total, currency)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee7da]">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: [CHART_COLORS.teal, CHART_COLORS.gold, CHART_COLORS.sage, CHART_COLORS.red, CHART_COLORS.gray][index % 5] }} />
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </ChartFrame>

          <ChartFrame
            title={t("analysis.incomeByCategory")}
            empty={analytics.income_breakdown.length === 0}
            emptyText={t("analysis.emptyChart")}
            table={{
              columns: [t("analysis.tableCategory"), t("analysis.tableAmount")],
              rows: analytics.income_breakdown.map((entry) => [categoryLabel(entry, t), fmt.money(entry.total, currency)]),
            }}
          >
            <ul className="space-y-3">
              {(() => {
                const max = Math.max(...analytics.income_breakdown.map((entry) => Number(entry.total)), 1);
                return analytics.income_breakdown.map((entry, index) => {
                  const amount = Number(entry.total);
                  const percent = Math.max(0, Math.round((amount / max) * 100));
                  return (
                    <li key={entry.category_id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{categoryLabel(entry, t)}</span>
                        <span className="font-semibold">{fmt.money(entry.total, currency)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee7da]">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: [CHART_COLORS.teal, CHART_COLORS.sage, CHART_COLORS.gold, CHART_COLORS.gray, CHART_COLORS.red][index % 5] }} />
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </ChartFrame>

          {hasDebt && (
            <ChartFrame
              title={t("analysis.debtTrend")}
              empty={false}
              emptyText={t("analysis.noDebts")}
              table={{
                columns: [t("analysis.tableDate"), ...analytics.debt_series.map((entry) => entry.account_name)],
                rows: (analytics.debt_series[0]?.points ?? []).map((point, index) => [
                  fmt.date(point.date, timeZone),
                  ...analytics.debt_series.map((entry) => fmt.money(entry.points[index]?.balance ?? "0", currency)),
                ]),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={(analytics.debt_series[0]?.points ?? []).map((point, index) => ({
                    label: fmt.date(point.date, timeZone),
                    ...Object.fromEntries(analytics.debt_series.map((entry) => [entry.account_name, Number(entry.points[index]?.balance ?? 0)])),
                  }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee7da" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={moneyTick} width={90} />
                  <Tooltip formatter={tooltipFormatter} />
                  <Legend />
                  {analytics.debt_series.map((entry, index) => (
                    <Line
                      key={entry.account_id}
                      name={entry.account_name}
                      type="monotone"
                      dataKey={entry.account_name}
                      stroke={[CHART_COLORS.red, CHART_COLORS.gold, CHART_COLORS.teal, CHART_COLORS.gray, CHART_COLORS.sage][index % 5]}
                      strokeWidth={2}
                      strokeDasharray={index === 0 ? undefined : `${(index + 2) * 2} 4`}
                      dot={false}
                      isAnimationActive={animate}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          )}
        </div>
      )}
    </FinancialShell>
  );
}
