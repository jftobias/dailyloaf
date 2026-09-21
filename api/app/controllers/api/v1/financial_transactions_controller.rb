module Api
  module V1
    class FinancialTransactionsController < ApplicationController
      include FinancialScope

      def index
        transactions = FinancialTransaction.where(account_id: visible_accounts).includes(:category, :account).order(occurred_on: :desc, created_at: :desc)
        render json: { transactions: transactions.map { |transaction| transaction_json(transaction) } }
      end

      def show
        render json: { transaction: transaction_json(visible_transaction) }
      end

      def create
        transaction = FinancialTransactionService.create!(household: financial_household, user: Current.user, attributes: transaction_params, idempotency_key: request.headers["Idempotency-Key"] || params[:idempotency_key])
        render json: { transaction: transaction_json(transaction) }, status: :created
      end

      def update
        transaction = visible_transaction
        if transaction.pending?
          transaction = FinancialTransactionService.update_pending!(transaction: transaction, user: Current.user, attributes: transaction_params)
          render json: { transaction: transaction_json(transaction) }
        else
          reversal, replacement = FinancialTransactionService.correct!(transaction: transaction, user: Current.user, attributes: transaction_params)
          render json: { reversal: transaction_json(reversal), replacement: transaction_json(replacement) }
        end
      end

      def post
        transaction = FinancialTransactionService.post!(visible_transaction)
        render json: { transaction: transaction_json(transaction) }
      end

      def reverse
        reversal = FinancialTransactionService.reverse!(transaction: visible_transaction)
        render json: { reversal: transaction_json(reversal) }
      end

      def destroy
        transaction = visible_transaction
        if transaction.pending?
          FinancialTransactionService.destroy_pending!(transaction: transaction)
          head :no_content
        else
          reversal = FinancialTransactionService.reverse!(transaction: transaction)
          render json: { reversal: transaction_json(reversal) }
        end
      end

      private

      def visible_transaction
        FinancialTransaction.where(account_id: visible_accounts).find(params[:id])
      end

      TRANSACTION_ATTRIBUTE_KEYS = %i[account_id category_id kind account_impact status occurred_on description notes].freeze

      def transaction_params
        TRANSACTION_ATTRIBUTE_KEYS.each_with_object({}) do |key, attributes|
          attributes[key] = params[key] if params.key?(key)
        end
      end

      def transaction_json(transaction)
        { id: transaction.id, account_id: transaction.account_id, category_id: transaction.category_id, transfer_id: transaction.transfer_id, kind: transaction.kind, account_impact: financial_decimal(transaction.account_impact), status: transaction.status, occurred_on: transaction.occurred_on, description: transaction.description, notes: transaction.notes, created_at: transaction.created_at, updated_at: transaction.updated_at, reversal_of_id: transaction.reversal_of_id, replacement_for_id: transaction.replacement_for_id, reversal_id: transaction.reversal&.id, replacement_id: transaction.replacement&.id }
      end
    end
  end
end
