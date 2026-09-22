require "rails_helper"

RSpec.describe "Credit availability and opening-balance normalization", type: :request do
  def create_account(household_id, name:, type:, balance: "0.0000", visibility: "shared", credit_limit: nil)
    params = { name: name, account_type: type, opening_balance: balance, opening_balance_date: Date.current, visibility: visibility }
    params[:credit_limit] = credit_limit if credit_limit
    post "/api/v1/households/#{household_id}/accounts",
      params: params, as: :json, headers: { "X-CSRF-Token" => csrf_token }
    response
  end

  def create_account!(household_id, **args)
    create_account(household_id, **args)
    expect(response).to have_http_status(:created)
    JSON.parse(response.body).fetch("account").fetch("id")
  end

  def debt(household_id, account_id)
    get "/api/v1/households/#{household_id}/debts/#{account_id}", headers: json_headers
    expect(response).to have_http_status(:ok)
    JSON.parse(response.body).fetch("debt")
  end

  def register_and_household
    register_user
    JSON.parse(response.body).dig("household", "id")
  end

  describe "opening-balance normalization" do
    it "stores a positive user-facing amount as canonical debt on a credit card" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000")

      account = Account.find(card_id)
      expect(account.opening_balance).to eq(BigDecimal("-500000"))
      expect(debt(household_id, card_id).fetch("debt_balance")).to eq("500000.0")

      get "/api/v1/households/#{household_id}/overview", headers: json_headers
      overview = JSON.parse(response.body).fetch("overview")
      expect(overview.fetch("total_liabilities")).to eq("500000.0")
      expect(overview.fetch("net_worth")).to eq("-500000.0")
    end

    it "preserves positive opening balances on asset accounts" do
      household_id = register_and_household
      checking_id = create_account!(household_id, name: "Checking", type: "checking", balance: "500000")
      expect(Account.find(checking_id).opening_balance).to eq(BigDecimal("500000"))

      get "/api/v1/households/#{household_id}/overview", headers: json_headers
      overview = JSON.parse(response.body).fetch("overview")
      expect(overview.fetch("total_assets")).to eq("500000.0")
      expect(overview.fetch("net_worth")).to eq("500000.0")
    end

    it "rejects a negative opening amount for any account type" do
      household_id = register_and_household
      create_account(household_id, name: "Card", type: "credit_card", balance: "-500000")
      expect(response).to have_http_status(:unprocessable_entity)
      create_account(household_id, name: "Checking", type: "checking", balance: "-10")
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects non-numeric opening amounts" do
      household_id = register_and_household
      create_account(household_id, name: "Card", type: "credit_card", balance: "abc")
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "credit limit" do
    it "stores and serializes an exact-decimal limit on credit cards" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "0", credit_limit: "2000000.5000")
      expect(Account.find(card_id).credit_limit).to eq(BigDecimal("2000000.5"))
      expect(debt(household_id, card_id).fetch("credit_limit")).to eq("2000000.5")
    end

    it "rejects a limit on non-card accounts" do
      household_id = register_and_household
      create_account(household_id, name: "Loan", type: "loan", balance: "100", credit_limit: "500")
      expect(response).to have_http_status(:unprocessable_entity)
      create_account(household_id, name: "Other", type: "other_liability", balance: "100", credit_limit: "500")
      expect(response).to have_http_status(:unprocessable_entity)
      create_account(household_id, name: "Checking", type: "checking", balance: "100", credit_limit: "500")
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects zero and negative limits" do
      household_id = register_and_household
      create_account(household_id, name: "Card", type: "credit_card", balance: "0", credit_limit: "0")
      expect(response).to have_http_status(:unprocessable_entity)
      create_account(household_id, name: "Card", type: "credit_card", balance: "0", credit_limit: "-100")
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "updates the limit through the account endpoint" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "0", credit_limit: "100")
      patch "/api/v1/households/#{household_id}/accounts/#{card_id}",
        params: { credit_limit: "250" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).dig("account", "credit_limit")).to eq("250.0")
    end

    it "omits availability math when no limit is configured" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "100")
      json = debt(household_id, card_id)
      expect(json.fetch("credit_limit")).to be_nil
      expect(json.fetch("available_credit")).to be_nil
      expect(json.fetch("utilization_percentage")).to be_nil
    end
  end

  describe "available credit and utilization" do
    it "computes availability from the posted balance" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "2000000")
      json = debt(household_id, card_id)
      expect(json.fetch("available_credit")).to eq("1500000.0")
      expect(json.fetch("utilization_percentage")).to eq("25.0")
      expect(json.fetch("over_limit_amount")).to eq("0.0")
    end

    it "reduces projected availability for pending card activity" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "2000000")
      category = Household.find(household_id).categories.find_by!(kind: :expense)

      post "/api/v1/households/#{household_id}/transactions",
        params: { account_id: card_id, kind: "expense", account_impact: "-100000", category_id: category.id, occurred_on: Date.current, description: "Purchase", status: "pending" },
        as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:created)

      json = debt(household_id, card_id)
      expect(json.fetch("debt_balance")).to eq("500000.0")
      expect(json.fetch("projected_debt_balance")).to eq("600000.0")
      expect(json.fetch("available_credit")).to eq("1400000.0")
      expect(json.fetch("utilization_percentage")).to eq("30.0")
    end

    it "reports the exceeded amount when the balance is over the limit" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "400000")
      json = debt(household_id, card_id)
      expect(json.fetch("available_credit")).to eq("-100000.0")
      expect(json.fetch("utilization_percentage")).to eq("125.0")
      expect(json.fetch("over_limit_amount")).to eq("100000.0")
    end

    it "increases availability on payment and restores it on aggregate reversal" do
      household_id = register_and_household
      checking_id = create_account!(household_id, name: "Checking", type: "checking", balance: "1000000")
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "2000000")

      post "/api/v1/households/#{household_id}/transfers",
        params: { source_account_id: checking_id, destination_account_id: card_id, amount: "200000" },
        as: :json, headers: { "X-CSRF-Token" => csrf_token, "Idempotency-Key" => "avail-pay-1" }
      expect(response).to have_http_status(:created)
      transfer_id = JSON.parse(response.body).dig("transfer", "id")
      expect(debt(household_id, card_id).fetch("available_credit")).to eq("1700000.0")
      post "/api/v1/households/#{household_id}/transfers/#{transfer_id}/reverse", as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:ok)
      json = debt(household_id, card_id)
      expect(json.fetch("available_credit")).to eq("1500000.0")
      expect(json.fetch("utilization_percentage")).to eq("25.0")
    end

    it "never counts available credit in household totals" do
      household_id = register_and_household
      create_account!(household_id, name: "Checking", type: "checking", balance: "1000000")
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000")

      get "/api/v1/households/#{household_id}/overview", headers: json_headers
      before = JSON.parse(response.body).fetch("overview")

      patch "/api/v1/households/#{household_id}/accounts/#{card_id}",
        params: { credit_limit: "2000000" }, as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:ok)

      get "/api/v1/households/#{household_id}/overview", headers: json_headers
      after = JSON.parse(response.body).fetch("overview")
      expect(after.fetch("net_worth")).to eq(before.fetch("net_worth"))
      expect(after.fetch("total_assets")).to eq(before.fetch("total_assets"))

      from = Date.current.beginning_of_month
      get "/api/v1/households/#{household_id}/analytics?from=#{from}&to=#{Date.current}&interval=month", headers: json_headers
      analytics = JSON.parse(response.body).fetch("analytics")
      expect(analytics.fetch("summary").fetch("income")).to eq("0.0")
      expect(analytics.fetch("summary").fetch("net_cash_flow")).to eq("0.0")
    end

    it "keeps the limit and availability readable on archived cards" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "2000000")
      post "/api/v1/households/#{household_id}/accounts/#{card_id}/archive", as: :json, headers: { "X-CSRF-Token" => csrf_token }
      json = debt(household_id, card_id)
      expect(json.fetch("credit_limit")).to eq("2000000.0")
      expect(json.fetch("available_credit")).to eq("1500000.0")
    end

    it "returns 404 for another household's card" do
      household_id = register_and_household
      other = Household.create!(name: "Other", currency_code: "COP")
      other_card = other.accounts.create!(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance: "-500", credit_limit: "2000", opening_balance_date: Date.current)
      get "/api/v1/households/#{household_id}/debts/#{other_card.id}", headers: json_headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "debt profile removal" do
    it "keeps the account, history, and credit limit after removing the profile" do
      household_id = register_and_household
      card_id = create_account!(household_id, name: "Card", type: "credit_card", balance: "500000", credit_limit: "2000000")
      post "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile",
        params: { minimum_payment: "25000", annual_interest_rate: "12" },
        as: :json, headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:created)

      delete "/api/v1/households/#{household_id}/accounts/#{card_id}/debt_profile", headers: { "X-CSRF-Token" => csrf_token }
      expect(response).to have_http_status(:no_content)

      json = debt(household_id, card_id)
      expect(json.fetch("debt_balance")).to eq("500000.0")
      expect(json.fetch("credit_limit")).to eq("2000000.0")
      expect(json.fetch("profile")).to be_nil
      expect(json.fetch("available_credit")).to eq("1500000.0")
    end
  end
end
