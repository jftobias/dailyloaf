module Api
  module V1
    class OverviewController < ApplicationController
      include FinancialScope

      def show
        from = Date.parse(params.fetch(:from, Date.current.beginning_of_month.to_s))
        to = Date.parse(params.fetch(:to, Date.current.to_s))
        overview = OverviewService.call(household: financial_household, user: Current.user, scope: params.fetch(:scope, "combined"), from: from, to: to)
        render json: { overview: overview }
      end
    end
  end
end
