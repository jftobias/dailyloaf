module Api
  module V1
    class TransfersController < ApplicationController
      include FinancialScope

      def index
        transfers = financial_household.transfers.includes(:financial_transactions, :reversal).where(source_account_id: visible_accounts).or(financial_household.transfers.includes(:financial_transactions, :reversal).where(destination_account_id: visible_accounts)).order(created_at: :desc)
        render json: { transfers: transfers.map { |transfer| transfer_json(transfer) } }
      end

      def show
        render json: { transfer: transfer_json(visible_transfer) }
      end

      def create
        transfer = TransferService.create!(household: financial_household, user: Current.user, source_account_id: transfer_params.fetch(:source_account_id), destination_account_id: transfer_params.fetch(:destination_account_id), amount: transfer_params.fetch(:amount), status: transfer_params[:status] || :posted, idempotency_key: request.headers["Idempotency-Key"] || params[:idempotency_key])
        render json: { transfer: transfer_json(transfer) }, status: :created
      end

      def update
        transfer = visible_transfer
        transfer = TransferService.update_pending!(transfer: transfer, user: Current.user, attributes: transfer_params)
        render json: { transfer: transfer_json(transfer) }
      end

      def reverse
        reversal = TransferService.reverse!(transfer: visible_transfer, user: Current.user)
        render json: { reversal: transfer_json(reversal) }
      end

      private

      def visible_transfer
        financial_household.transfers.includes(:financial_transactions, :reversal).where(source_account_id: visible_accounts).or(financial_household.transfers.includes(:financial_transactions, :reversal).where(destination_account_id: visible_accounts)).find(params[:id])
      end

      def transfer_params
        params.permit(:source_account_id, :destination_account_id, :amount, :status, :idempotency_key)
      end

      def transfer_json(transfer)
        { id: transfer.id, source_account_id: transfer.source_account_id, destination_account_id: transfer.destination_account_id, amount: financial_decimal(transfer.amount), currency_code: transfer.currency_code, status: transfer.status, created_at: transfer.created_at, updated_at: transfer.updated_at, reversal_of_id: transfer.reversal_of_id, reversed: transfer.reversal.present?, transaction_ids: transfer.financial_transactions.ids }
      end
    end
  end
end
