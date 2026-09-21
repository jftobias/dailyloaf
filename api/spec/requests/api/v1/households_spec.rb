require "rails_helper"

RSpec.describe "Household API", type: :request do
  it "returns 404 for another household" do
    register_user
    other_household = Household.create!(name: "Other", currency_code: "COP")

    get "/api/v1/households/#{other_household.id}", headers: json_headers

    expect(response).to have_http_status(:not_found)
  end

  it "supports users with multiple household memberships" do
    register_user
    user = User.find_by!(email_address: "person@example.com")
    second_household = Household.create!(name: "Second", currency_code: "COP")
    HouseholdMembership.create!(user: user, household: second_household, role: :member)

    get "/api/v1/households", headers: json_headers

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).fetch("households").size).to eq(2)
  end

  it "allows owners to list memberships but not ordinary members" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")

    get "/api/v1/households/#{household_id}/memberships", headers: json_headers
    expect(response).to have_http_status(:ok)

    member = User.create!(email_address: "member@example.com", password: "password123")
    HouseholdMembership.create!(user: member, household_id: household_id, role: :member)
    delete "/api/v1/auth/session", headers: json_headers("X-CSRF-Token" => csrf_token)
    login_user(email: "member@example.com", password: "password123")

    get "/api/v1/households/#{household_id}/memberships", headers: json_headers
    expect(response).to have_http_status(:forbidden)
  end
end
