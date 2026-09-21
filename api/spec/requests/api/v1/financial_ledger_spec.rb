require "rails_helper"

RSpec.describe "Financial ledger API", type: :request do
  it "creates accounts and returns decimal-string balances" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")

    post "/api/v1/households/#{household_id}/accounts", params: { name: "Checking", account_type: "checking", opening_balance: "100.0000", opening_balance_date: Date.current, visibility: "shared" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }

    expect(response).to have_http_status(:created)
    body = JSON.parse(response.body).fetch("account")
    expect(body.fetch("opening_balance")).to eq("100.0")
    expect(body.fetch("posted_balance")).to eq("100.0")
  end

  it "returns 404 for another household's financial account" do
    register_user
    other_household = Household.create!(name: "Other", currency_code: "COP")
    account = other_household.accounts.create!(name: "Other checking", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current)

    get "/api/v1/households/#{other_household.id}/accounts/#{account.id}", headers: json_headers

    expect(response).to have_http_status(:not_found)
  end
end
