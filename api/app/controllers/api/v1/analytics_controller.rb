module Api
  module V1
    class AnalyticsController < ApplicationController
      include FinancialScope

      rescue_from ArgumentError, with: :render_invalid_params

      def show
        household = financial_household
        to = Date.parse(params.fetch(:to, zone(household).today.to_s))
        from = Date.parse(params.fetch(:from, to.beginning_of_month.to_s))
        result = AnalyticsService.call(
          household: household,
          user: Current.user,
          scope: params.fetch(:scope, "combined"),
          from: from,
          to: to,
          interval: params.fetch(:interval, "month")
        )
        render json: { analytics: analytics_json(household, result, from, to) }
      end

      private

      def zone(household)
        Time.find_zone!(household.time_zone)
      end

      def analytics_json(household, result, from, to)
        {
          scope: params.fetch(:scope, "combined"),
          interval: params.fetch(:interval, "month"),
          from: from.to_s,
          to: to.to_s,
          currency_code: household.currency_code,
          time_zone: household.time_zone,
          summary: result.summary,
          previous_period: result.previous_period,
          comparison: result.comparison,
          series: result.series,
          income_breakdown: result.income_breakdown,
          expense_breakdown: result.expense_breakdown,
          debt_series: result.debt_series
        }
      end

      def render_invalid_params(exception)
        render_error("invalid_analytics_params", "The analytics parameters are invalid.", status: :unprocessable_entity, details: { reason: exception.message })
      end
    end
  end
end
