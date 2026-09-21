require "rails_helper"

RSpec.describe "Transfer aggregate boundary API", type: :request do
  def create_account(household_id, name:, type:, balance:, visibility: "shared")
    post "/api/v1/households/#{household_id}/accounts",
      params: { name: name, account_type: type, opening_balance: balance, opening_balance_date: Date.current, visibility: visibility },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }
    JSON.parse(response.body).fetch("account").fetch("id")
  end

  def create_transfer(household_id, source_id:, destination_id:, amount:, status: "posted")
    post "/api/v1/households/#{household_id}/transfers",
      params: { source_account_id: source_id, destination_account_id: destination_id, amount: amount, status: status },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }
    JSON.parse(response.body).fetch("transfer")
  end

  it "rejects every transaction-level mutation on transfer legs" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "1000.0000")
    savings_id = create_account(household_id, name: "Savings", type: "savings", balance: "0.0000")
    transfer = create_transfer(household_id, source_id: checking_id, destination_id: savings_id, amount: "200.0000")
    leg_ids = transfer.fetch("transaction_ids")

    leg_ids.each do |leg_id|
      patch "/api/v1/households/#{household_id}/transactions/#{leg_id}",
        params: { description: "tampered" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

      post "/api/v1/households/#{household_id}/transactions/#{leg_id}/post", as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

      post "/api/v1/households/#{household_id}/transactions/#{leg_id}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

      delete "/api/v1/households/#{household_id}/transactions/#{leg_id}", headers: { "X-CSRF-Token" => csrf_token }
      expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

      get "/api/v1/households/#{household_id}/transactions/#{leg_id}", headers: json_headers
      expect(response).to have_http_status(:ok)
    end

    get "/api/v1/households/#{household_id}/accounts/#{checking_id}", headers: json_headers
    expect(JSON.parse(response.body).dig("account", "posted_balance")).to eq("800.0")
  end

  it "rejects pending transfer-leg mutation as well" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "1000.0000")
    savings_id = create_account(household_id, name: "Savings", type: "savings", balance: "0.0000")
    transfer = create_transfer(household_id, source_id: checking_id, destination_id: savings_id, amount: "50.0000", status: "pending")
    leg_id = transfer.fetch("transaction_ids").first

    patch "/api/v1/households/#{household_id}/transactions/#{leg_id}",
      params: { description: "tampered" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

    post "/api/v1/households/#{household_id}/transactions/#{leg_id}/post", as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")

    delete "/api/v1/households/#{household_id}/transactions/#{leg_id}", headers: { "X-CSRF-Token" => csrf_token }
    expect(JSON.parse(response.body).dig("error", "code")).to eq("transfer_leg_mutation")
  end

  it "returns 404 for a transfer leg belonging to another household" do
    register_user
    other = Household.create!(name: "Other", currency_code: "COP")
    source = other.accounts.create!(name: "A", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current)
    destination = other.accounts.create!(name: "B", account_type: :savings, currency_code: "COP", opening_balance_date: Date.current)
    transfer = Transfer.create!(household: other, source_account: source, destination_account: destination, amount: "10.0000", currency_code: "COP", status: :posted)
    leg = transfer.financial_transactions.create!(household: other, account: source, kind: :transfer, account_impact: "-10.0000", status: :posted, occurred_on: Date.current, description: "leg")

    household_id = JSON.parse(response.body).dig("household", "id")
    post "/api/v1/households/#{household_id}/transactions/#{leg.id}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:not_found)
  end

  it "reverses a transfer atomically through the aggregate endpoint and keeps analytics correct" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "1000.0000")
    savings_id = create_account(household_id, name: "Savings", type: "savings", balance: "0.0000")
    transfer = create_transfer(household_id, source_id: checking_id, destination_id: savings_id, amount: "200.0000")

    post "/api/v1/households/#{household_id}/transfers/#{transfer.fetch("id")}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:ok)
    reversal = JSON.parse(response.body).fetch("reversal")
    expect(reversal.fetch("reversal_of_id")).to eq(transfer.fetch("id"))
    expect(reversal.fetch("transaction_ids").size).to eq(2)

    get "/api/v1/households/#{household_id}/accounts/#{checking_id}", headers: json_headers
    expect(JSON.parse(response.body).dig("account", "posted_balance")).to eq("1000.0")
    get "/api/v1/households/#{household_id}/accounts/#{savings_id}", headers: json_headers
    expect(JSON.parse(response.body).dig("account", "posted_balance")).to eq("0.0")

    post "/api/v1/households/#{household_id}/transfers/#{transfer.fetch("id")}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:unprocessable_entity)

    from = Date.current.beginning_of_month
    get "/api/v1/households/#{household_id}/analytics?scope=combined&from=#{from}&to=#{Date.current}&interval=month", headers: json_headers
    analytics = JSON.parse(response.body).fetch("analytics")
    expect(analytics.fetch("summary").fetch("income")).to eq("0.0")
    expect(analytics.fetch("summary").fetch("expenses")).to eq("0.0")
    expect(analytics.fetch("summary").fetch("net_cash_flow")).to eq("0.0")

    get "/api/v1/households/#{household_id}/overview", headers: json_headers
    overview = JSON.parse(response.body).fetch("overview")
    expect(overview.fetch("net_worth")).to eq("1000.0")
  end
end
