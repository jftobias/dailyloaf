module Api
  module V1
    module Auth
      class BaseController < ApplicationController
        private

        def user_json(user)
          {
            id: user.id,
            email: user.email_address,
            households: user.household_memberships.includes(:household).map do |membership|
              household_json(membership)
            end
          }
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
      end
    end
  end
end
