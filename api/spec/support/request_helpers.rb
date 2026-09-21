module RequestHelpers
  def json_headers(extra = {})
    { "CONTENT_TYPE" => "application/json", "ACCEPT" => "application/json" }.merge(extra)
  end

  def csrf_token
    get "/api/v1/auth/csrf"
    expect(response).to have_http_status(:ok)
    JSON.parse(response.body).fetch("csrf_token")
  end

  def register_user(email: "person@example.com", password: "password123", household_name: "Home", currency_code: "COP")
    post(
      "/api/v1/auth/register",
      params: { email: email, password: password, household_name: household_name, currency_code: currency_code },
      as: :json,
      headers: { "X-CSRF-Token" => csrf_token }
    )
  end

  def login_user(email:, password:)
    post(
      "/api/v1/auth/session",
      params: { email: email, password: password },
      as: :json,
      headers: { "X-CSRF-Token" => csrf_token }
    )
  end
end

RSpec.configure do |config|
  config.include RequestHelpers, type: :request
  config.before(type: :request) { host! "localhost" }
end
