module Api
  module V1
    class DebtProfilesController < ApplicationController
      include FinancialScope

      def self.profile_json(profile)
        {
          id: profile.id,
          account_id: profile.account_id,
          creditor_name: profile.creditor_name,
          annual_interest_rate: BigDecimal(profile.annual_interest_rate.to_s).to_s("F"),
          minimum_payment: BigDecimal(profile.minimum_payment.to_s).to_s("F"),
          planned_monthly_payment: profile.planned_monthly_payment.nil? ? nil : BigDecimal(profile.planned_monthly_payment.to_s).to_s("F"),
          payment_due_day: profile.payment_due_day,
          original_principal: profile.original_principal.nil? ? nil : BigDecimal(profile.original_principal.to_s).to_s("F"),
          opened_on: profile.opened_on,
          maturity_on: profile.maturity_on,
          notes: profile.notes,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      end

      def show
        profile = profile_for
        raise ActiveRecord::RecordNotFound if profile.nil?
        render json: { debt_profile: self.class.profile_json(profile) }
      end

      def create
        account = visible_account(params[:account_id])
        profile = account.build_debt_profile(profile_params.merge(household: account.household))
        profile.save!
        render json: { debt_profile: self.class.profile_json(profile) }, status: :created
      end

      def update
        profile = profile_for
        raise ActiveRecord::RecordNotFound if profile.nil?
        profile.update!(profile_params)
        render json: { debt_profile: self.class.profile_json(profile) }
      end

      def destroy
        profile = profile_for
        raise ActiveRecord::RecordNotFound if profile.nil?
        profile.destroy!
        head :no_content
      end

      private

      def visible_liability_account
        account = visible_account(params[:account_id])
        raise ActiveRecord::RecordNotFound unless account.liability?
        account
      end

      def profile_for
        visible_liability_account.debt_profile
      end

      def profile_params
        params.permit(:creditor_name, :annual_interest_rate, :minimum_payment, :planned_monthly_payment, :payment_due_day, :original_principal, :opened_on, :maturity_on, :notes)
      end
    end
  end
end
