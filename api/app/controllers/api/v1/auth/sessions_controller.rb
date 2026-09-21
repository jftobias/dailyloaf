module Api
  module V1
    module Auth
      class SessionsController < BaseController
        allow_unauthenticated_access only: %i[create csrf]
        rate_limit to: 10, within: 3.minutes, only: :create, with: -> { render_error("rate_limited", "Too many sign-in attempts. Try again later.", status: :too_many_requests) }
        rate_limit to: 30, within: 1.minute, only: :csrf, with: -> { render_error("rate_limited", "Too many CSRF requests. Try again later.", status: :too_many_requests) }

        def create
          user = User.authenticate_by(email_address: params[:email], password: params[:password])
          return render_error("invalid_credentials", "Invalid email or password.", status: :unauthorized) unless user

          start_new_session_for(user)
          render json: { user: user_json(user) }, status: :created
        end

        def destroy
          terminate_session
          head :no_content
        end

        def me
          render json: { user: user_json(Current.user) }
        end

        def csrf
          render json: { csrf_token: form_authenticity_token }
        end
      end
    end
  end
end
