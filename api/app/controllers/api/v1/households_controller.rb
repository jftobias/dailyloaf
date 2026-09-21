module Api
  module V1
    class HouseholdsController < ApplicationController
      def index
        render json: {
          households: Current.user.household_memberships.includes(:household).map { |membership| household_json(membership) }
        }
      end

      def show
        render json: { household: household_json(household_membership) }
      end

      def update
        return render_error("forbidden", "Owner permissions are required.", status: :forbidden) unless household_membership.owner?

        household_membership.household.update!(household_params)
        render json: { household: household_json(household_membership) }
      end

      private

      def household_membership
        @household_membership ||= Current.user.household_memberships.includes(:household).find_by!(household_id: params[:id])
      end

      def household_json(membership)
        {
          id: membership.household.id,
          name: membership.household.name,
          currency_code: membership.household.currency_code,
          time_zone: membership.household.time_zone,
          role: membership.role
        }
      end

      def household_params
        params.permit(:name, :currency_code, :time_zone)
      end
    end
  end
end
