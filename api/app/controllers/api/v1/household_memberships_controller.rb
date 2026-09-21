module Api
  module V1
    class HouseholdMembershipsController < ApplicationController
      before_action :load_owner_membership

      def index
        render json: {
          memberships: @owner_membership.household.household_memberships.includes(:user).map do |membership|
            membership_json(membership)
          end
        }
      end

      def update
        membership = @owner_membership.household.household_memberships.find(params[:id])
        HouseholdMembershipManager.update_role!(membership, params.require(:role))
        render json: { membership: membership_json(membership) }
      end

      def destroy
        membership = @owner_membership.household.household_memberships.find(params[:id])
        HouseholdMembershipManager.remove!(membership)
        head :no_content
      end

      private

      def load_owner_membership
        @owner_membership = Current.user.household_memberships.find_by!(household_id: params[:household_id])
        return if @owner_membership.owner?

        render_error("forbidden", "Owner permissions are required.", status: :forbidden)
      end

      def membership_json(membership)
        {
          id: membership.id,
          user_id: membership.user_id,
          email: membership.user.email_address,
          role: membership.role
        }
      end
    end
  end
end
