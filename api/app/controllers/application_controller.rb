class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection
  include Authentication

  protect_from_forgery with: :exception

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_record_invalid
  rescue_from TransferLegMutationError, with: :render_transfer_leg_mutation
  rescue_from ActionController::InvalidAuthenticityToken, with: :render_invalid_csrf
  rescue_from ActionController::ParameterMissing, with: :render_parameter_missing
  rescue_from ActionDispatch::Http::Parameters::ParseError, with: :render_invalid_json

  private

  def render_error(code, message, status:, details: nil)
    error = { code: code, message: message }
    error[:details] = details if details.present?
    render json: { error: error }, status: status
  end

  def render_not_found
    render_error("not_found", "The requested resource was not found.", status: :not_found)
  end

  def render_transfer_leg_mutation
    render_error("transfer_leg_mutation", "Transfer legs are managed through their transfer.", status: :unprocessable_entity)
  end

  def render_record_invalid(exception)
    render_error(
      "validation_failed",
      "The request could not be completed.",
      status: :unprocessable_entity,
      details: exception.record.errors.to_hash
    )
  end

  def render_invalid_csrf
    render_error("invalid_csrf_token", "The request could not be verified.", status: :unprocessable_content)
  end

  def render_parameter_missing(exception)
    render_error("invalid_request", "The request could not be completed.", status: :bad_request, details: { parameter: exception.param })
  end

  def render_invalid_json
    render_error("invalid_json", "The request body must be valid JSON.", status: :bad_request)
  end
end
