module Api
  module V1
    module Auth
      class RegistrationsController < BaseController
        allow_unauthenticated_access only: :create
        rate_limit to: 5, within: 1.minute, only: :create, with: -> { render_error("rate_limited", "Too many registration attempts. Try again later.", status: :too_many_requests) }

        def create
          result = RegistrationService.call(
            email_address: registration_params[:email],
            password: registration_params[:password],
            household_name: registration_params[:household_name],
            currency_code: registration_params[:currency_code].presence || "COP",
            time_zone: registration_params[:time_zone].presence || "America/Bogota",
            request: request
          )
          Current.session = result.session
          cookies.signed[Authentication::SESSION_COOKIE] = session_cookie_options(result.session).merge(value: result.session.raw_token)

          render json: { user: user_json(result.user), household: household_json(result.membership) }, status: :created
        end

        private

        def registration_params
          params.permit(:email, :password, :household_name, :currency_code, :time_zone)
        end
      end
    end
  end
end
