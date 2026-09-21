require "rails_helper"
require "time"

RSpec.describe "Authentication API", type: :request do
  it "registers and authenticates a user" do
    register_user

    expect(response).to have_http_status(:created)
    expect(response.headers["Set-Cookie"].join).to include("dailyloaf_session=")
    cookie_header = response.headers["Set-Cookie"].join.downcase
    expect(cookie_header).to include("httponly")
    expect(cookie_header).to include("samesite=lax")
    expect(cookie_header).not_to include("domain=")
    cookie_expiry = Time.httpdate(response.headers["Set-Cookie"].join[/expires=([^;]+)/i, 1])
    expect(cookie_expiry).to be <= Session.order(:id).last.expires_at

    get "/api/v1/auth/me", headers: json_headers

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig("user", "email")).to eq("person@example.com")
    expect(response.body).not_to include("dailyloaf_session")
  end

  it "returns the same authentication error for unknown and invalid credentials" do
    register_user
    first_token = csrf_token
    delete "/api/v1/auth/session", headers: json_headers("X-CSRF-Token" => first_token)

    login_user(email: "person@example.com", password: "wrongpass")
    invalid_response = response.body

    login_user(email: "unknown@example.com", password: "wrongpass")

    expect(response).to have_http_status(:unauthorized)
    expect(response.body).to eq(invalid_response)
  end

  it "rejects an expired persisted session" do
    register_user
    Session.order(:id).last.update!(expires_at: 1.minute.ago)

    get "/api/v1/auth/me", headers: json_headers

    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects a revoked persisted session" do
    register_user
    Session.order(:id).last.revoke!

    get "/api/v1/auth/me", headers: json_headers

    expect(response).to have_http_status(:unauthorized)
  end

  it "revokes the persisted session on logout" do
    register_user
    session_id = Session.order(:id).last.id

    delete "/api/v1/auth/session", headers: json_headers("X-CSRF-Token" => csrf_token)

    expect(response).to have_http_status(:no_content)
    expect(Session.find(session_id).revoked_at).to be_present

    get "/api/v1/auth/me", headers: json_headers

    expect(response).to have_http_status(:unauthorized)
  end

  it "validates the configurable SameSite cookie policy" do
    original = ENV["SESSION_COOKIE_SAME_SITE"]
    ENV["SESSION_COOKIE_SAME_SITE"] = "none"
    controller = Api::V1::Auth::SessionsController.new

    expect { controller.send(:session_cookie_same_site) }.to raise_error(RuntimeError, /requires production HTTPS/)
    allow(Rails.env).to receive(:production?).and_return(true)
    expect(controller.send(:session_cookie_same_site)).to eq(:none)

    ENV["SESSION_COOKIE_SAME_SITE"] = "invalid"
    expect { controller.send(:session_cookie_same_site) }.to raise_error(RuntimeError, /must be lax or none/)
  ensure
    ENV["SESSION_COOKIE_SAME_SITE"] = original
  end

  it "configures native rate limiting callbacks for auth endpoints" do
    session_callbacks = Api::V1::Auth::SessionsController._process_action_callbacks.map(&:filter)
    registration_callbacks = Api::V1::Auth::RegistrationsController._process_action_callbacks.map(&:filter)

    expect(session_callbacks.count { |filter| filter.respond_to?(:call) }).to be >= 2
    expect(registration_callbacks.count { |filter| filter.respond_to?(:call) }).to be >= 1
  end

  it "rejects state changes without a CSRF token" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")

    patch "/api/v1/households/#{household_id}", params: { name: "Changed" }, as: :json

    expect(response).to have_http_status(:unprocessable_content)
    expect(JSON.parse(response.body).dig("error", "code")).to eq("invalid_csrf_token")
  end

  it "accepts state changes with the issued CSRF token" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")

    patch(
      "/api/v1/households/#{household_id}",
      params: { name: "Changed" },
      as: :json,
      headers: { "X-CSRF-Token" => csrf_token }
    )

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig("household", "name")).to eq("Changed")
  end

  it "exposes only configured CORS origins" do
    configured_origin = ENV.fetch("CORS_ORIGINS", "http://localhost:3000").split(",").first
    get "/api/v1/auth/csrf", headers: { "HTTP_ORIGIN" => configured_origin }

    expect(response.headers["Access-Control-Allow-Origin"]).to eq(configured_origin)
    expect(response.headers["Access-Control-Allow-Credentials"]).to eq("true")

    options "/api/v1/auth/csrf", headers: {
      "HTTP_ORIGIN" => configured_origin,
      "HTTP_ACCESS_CONTROL_REQUEST_METHOD" => "POST",
      "HTTP_ACCESS_CONTROL_REQUEST_HEADERS" => "X-CSRF-Token, Idempotency-Key"
    }
    expect(response.headers["Access-Control-Allow-Headers"]).to include("Idempotency-Key")

    get "/api/v1/auth/csrf", headers: { "HTTP_ORIGIN" => "http://evil.example" }

    expect(response.headers["Access-Control-Allow-Origin"]).to be_nil
  end
end
