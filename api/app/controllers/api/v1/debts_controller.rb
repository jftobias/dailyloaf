module Api
  module V1
    class DebtsController < ApplicationController
      include FinancialScope

      def index
        accounts = visible_accounts.select(&:liability?)
        balances = AccountBalanceService.for(accounts)
        profiles = DebtProfile.where(account_id: accounts.map(&:id)).index_by(&:account_id)
        render json: { debts: accounts.map { |account| debt_json(account, balances.fetch(account), profiles[account.id]) } }
      end

      def show
        account = visible_debt_account
        render json: { debt: debt_json(account, AccountBalanceService.for([ account ]).fetch(account), account.debt_profile) }
      end

      def projection
        account = visible_debt_account
        profile = account.debt_profile
        raise ActiveRecord::RecordNotFound if profile.nil?
        render json: { projection: projection_for(account, profile) }
      end

      private

      def visible_debt_account
        account = visible_account(params[:account_id])
        raise ActiveRecord::RecordNotFound unless account.liability?
        account
      end

      def projection_for(account, profile, balances = nil)
        debt_balance = balances ? -balances.fetch(:posted_balance) : -account.posted_balance
        DebtProjectionService.call(balance: debt_balance, profile: profile, time_zone: account.household.time_zone)
      end

      def debt_json(account, balances, profile)
        debt_balance = -balances.fetch(:posted_balance)
        json = {
          account_id: account.id,
          name: account.name,
          account_type: account.account_type,
          currency_code: account.currency_code,
          visibility: account.visibility,
          archived_at: account.archived_at,
          posted_balance: financial_decimal(balances.fetch(:posted_balance)),
          pending_impact: financial_decimal(balances.fetch(:pending_impact)),
          projected_balance: financial_decimal(balances.fetch(:projected_balance)),
          debt_balance: financial_decimal(debt_balance),
          projected_debt_balance: financial_decimal(-balances.fetch(:projected_balance)),
          profile: profile ? DebtProfilesController.profile_json(profile) : nil,
          paid_off_ratio: progress_ratio(debt_balance, profile)
        }
        json.merge!(credit_fields(account, balances)) if account.account_type == "credit_card"
        if profile
          projection = projection_for(account, profile, balances)
          json[:estimated_payoff_date] = projection[:payoff_date]
          json[:estimated_months] = projection[:months]
          json[:amortizing] = projection[:amortizing]
        end
        json
      end

      # Available credit is borrowing capacity derived from the projected
      # balance (posted + pending). It is never a financial total.
      def credit_fields(account, balances)
        return { credit_limit: nil, available_credit: nil, utilization_percentage: nil, over_limit_amount: nil } if account.credit_limit.nil?
        limit = BigDecimal(account.credit_limit.to_s)
        projected_debt = -balances.fetch(:projected_balance)
        {
          credit_limit: financial_decimal(limit),
          available_credit: financial_decimal(limit - projected_debt),
          utilization_percentage: financial_decimal((projected_debt / limit * 100).round(2, mode: :half_even)),
          over_limit_amount: financial_decimal([ projected_debt - limit, BigDecimal(0) ].max)
        }
      end

      def progress_ratio(debt_balance, profile)
        return nil if profile.nil? || profile.original_principal.nil? || profile.original_principal <= 0
        paid = profile.original_principal - debt_balance
        ratio = paid / profile.original_principal
        financial_decimal(ratio.clamp(0, 1))
      end
    end
  end
end
