require "rails_helper"

RSpec.describe "Debt and analytics API", type: :request do
  def create_account(household_id, name:, type:, balance:, visibility: "shared", owner: nil)
    post "/api/v1/households/#{household_id}/accounts",
      params: { name: name, account_type: type, opening_balance: balance, opening_balance_date: Date.current, visibility: visibility },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }
    JSON.parse(response.body).fetch("account").fetch("id")
  end

  it "creates, reads, updates, and deletes a debt profile on a liability account" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "500.0000")

    post "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
      params: { creditor_name: "Bank", annual_interest_rate: "24.5", minimum_payment: "50.0000", planned_monthly_payment: "100.0000", payment_due_day: 15, original_principal: "500.0000" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }

    expect(response).to have_http_status(:created)
    profile = JSON.parse(response.body).fetch("debt_profile")
    expect(profile.fetch("annual_interest_rate")).to eq("24.5")
    expect(profile.fetch("minimum_payment")).to eq("50.0")

    patch "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
      params: { minimum_payment: "60.0000" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(JSON.parse(response.body).dig("debt_profile", "minimum_payment")).to eq("60.0")

    delete "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile", headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:no_content)
    get "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile", headers: json_headers
    expect(response).to have_http_status(:not_found)
  end

  it "rejects profiles on asset accounts and other households' accounts" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "100.0000")

    post "/api/v1/households/#{household_id}/accounts/#{checking_id}/debt_profile",
      params: { minimum_payment: "10.0000" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:unprocessable_entity)

    other = Household.create!(name: "Other", currency_code: "COP")
    other_card = other.accounts.create!(name: "Card", account_type: :loan, currency_code: "COP", opening_balance_date: Date.current)
    post "/api/v1/households/#{other.id}/accounts/#{other_card.id}/debt_profile",
      params: { minimum_payment: "10.0000" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:not_found)
  end

  it "lists debts with balances and projection hints" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "500.0000")
    create_account(household_id, name: "Checking", type: "checking", balance: "100.0000")
    post "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
      params: { annual_interest_rate: "0", minimum_payment: "100.0000" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }

    get "/api/v1/households/#{household_id}/debts", headers: json_headers
    debts = JSON.parse(response.body).fetch("debts")
    expect(debts.size).to eq(1)
    debt = debts.first
    expect(debt.fetch("debt_balance")).to eq("500.0")
    expect(debt.fetch("paid_off_ratio")).to be_nil
    expect(debt.fetch("amortizing")).to be(true)
    expect(debt.fetch("estimated_months")).to eq(5)
  end

  it "returns a payoff projection with decimal strings" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "250.0000")
    post "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
      params: { annual_interest_rate: "0", minimum_payment: "100.0000" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }

    get "/api/v1/households/#{household_id}/debts/#{card_id}/projection", headers: json_headers
    projection = JSON.parse(response.body).fetch("projection")
    expect(projection.fetch("amortizing")).to be(true)
    expect(projection.fetch("months")).to eq(3)
    expect(projection.fetch("total_paid")).to eq("250.0")
    expect(projection.fetch("current_balance")).to eq("250.0")
  end

  it "reduces debt via a transfer payment without touching income/expense analytics" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "1000.0000")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "500.0000")

    post "/api/v1/households/#{household_id}/transfers",
      params: { source_account_id: checking_id, destination_account_id: card_id, amount: "200.0000" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token, "Idempotency-Key" => "debt-pay-1" }
    expect(response).to have_http_status(:created)

    get "/api/v1/households/#{household_id}/debts/#{card_id}", headers: json_headers
    expect(JSON.parse(response.body).dig("debt", "debt_balance")).to eq("300.0")

    from = Date.current.beginning_of_month
    get "/api/v1/households/#{household_id}/analytics?scope=combined&from=#{from}&to=#{Date.current}&interval=month", headers: json_headers
    analytics = JSON.parse(response.body).fetch("analytics")
    expect(analytics.fetch("summary").fetch("expenses")).to eq("0.0")
    expect(analytics.fetch("summary").fetch("income")).to eq("0.0")

    get "/api/v1/households/#{household_id}/transfers", headers: json_headers
    transfer_id = JSON.parse(response.body).fetch("transfers").first.fetch("id")
    post "/api/v1/households/#{household_id}/transfers/#{transfer_id}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:ok)

    get "/api/v1/households/#{household_id}/debts/#{card_id}", headers: json_headers
    expect(JSON.parse(response.body).dig("debt", "debt_balance")).to eq("500.0")
  end

  it "keeps an archived debt readable but rejects new payments to it" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "100.0000")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "50.0000")
    post "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
      params: { minimum_payment: "10.0000" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    post "/api/v1/households/#{household_id}/accounts/#{card_id}/archive", as: :json, headers: { "X-CSRF-Token" => csrf_token }

    get "/api/v1/households/#{household_id}/debts/#{card_id}", headers: json_headers
    expect(response).to have_http_status(:ok)

    post "/api/v1/households/#{household_id}/transfers",
      params: { source_account_id: checking_id, destination_account_id: card_id, amount: "10.0000" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "validates analytics parameters" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")

    get "/api/v1/households/#{household_id}/analytics?interval=year", headers: json_headers
    expect(response).to have_http_status(:unprocessable_entity)
    get "/api/v1/households/#{household_id}/analytics?scope=nope", headers: json_headers
    expect(response).to have_http_status(:unprocessable_entity)
    get "/api/v1/households/#{household_id}/analytics?from=2026-02-01&to=2026-01-01", headers: json_headers
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "returns analytics series, comparison, breakdowns, and debt series" do
    register_user
    household_id = JSON.parse(response.body).dig("household", "id")
    checking_id = create_account(household_id, name: "Checking", type: "checking", balance: "1000.0000")
    card_id = create_account(household_id, name: "Card", type: "credit_card", balance: "500.0000")
    salary = Household.find(household_id).categories.find_by!(kind: :income, name: "Salary")

    post "/api/v1/households/#{household_id}/transactions",
      params: { account_id: checking_id, kind: "income", account_impact: "500.0000", category_id: salary.id, occurred_on: Date.current, description: "Pay", status: "posted" },
      as: :json, headers: { "X-CSRF-Token" => csrf_token }
    expect(response).to have_http_status(:created)

    from = Date.current.beginning_of_month
    get "/api/v1/households/#{household_id}/analytics?from=#{from}&to=#{Date.current}&interval=month", headers: json_headers
    analytics = JSON.parse(response.body).fetch("analytics")

    expect(analytics.fetch("currency_code")).to eq("COP")
    expect(analytics.fetch("summary").fetch("income")).to eq("500.0")
    expect(analytics.fetch("income_breakdown").first.fetch("category_id")).to eq(salary.id)
    expect(analytics.fetch("series").length).to eq(1)
    expect(analytics.fetch("debt_series").map { |row| row["account_id"] }).to include(card_id)
    expect(analytics.fetch("comparison").fetch("income_change")).to eq("500.0")
  end
end
