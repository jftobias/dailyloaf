module Api
  module V1
    class AccountsController < ApplicationController
      include FinancialScope

      def index
        accounts = visible_accounts.to_a
        balances = AccountBalanceService.for(accounts)
        render json: { accounts: accounts.map { |account| account_json(account, balances.fetch(account)) } }
      end

      def show
        render json: { account: account_json(visible_account(params[:id])) }
      end

      def create
        account = AccountService.create!(household: financial_household, user: Current.user, attributes: account_params)
        render json: { account: account_json(account) }, status: :created
      end

      def update
        account = visible_account(params[:id])
        account.update!(account_params.except(:opening_balance, :opening_balance_date, :currency_code))
        render json: { account: account_json(account) }
      end

      def archive
        AccountService.archive!(visible_account(params[:id]))
        head :no_content
      end

      private

      def account_params
        params.permit(:name, :account_type, :currency_code, :opening_balance, :opening_balance_date, :visibility, :credit_limit)
      end

      def account_json(account, balances = nil)
        balances ||= AccountBalanceService.for([ account ]).fetch(account)
        {
          id: account.id,
          name: account.name,
          account_type: account.account_type,
          currency_code: account.currency_code,
          opening_balance: financial_decimal(account.opening_balance),
          opening_balance_date: account.opening_balance_date,
          visibility: account.visibility,
          private_owner_id: account.private_owner_id,
          credit_limit: account.credit_limit.nil? ? nil : financial_decimal(account.credit_limit),
          archived_at: account.archived_at,
          posted_balance: financial_decimal(balances.fetch(:posted_balance)),
          pending_impact: financial_decimal(balances.fetch(:pending_impact)),
          projected_balance: financial_decimal(balances.fetch(:projected_balance))
        }
      end
    end
  end
end
