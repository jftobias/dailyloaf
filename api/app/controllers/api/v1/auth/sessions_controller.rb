module Api
  module V1
    module Auth
      class SessionsController < BaseController
        allow_unauthenticated_access only: %i[create csrf]

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
