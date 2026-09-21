require "rails_helper"

RSpec.describe AnalyticsService do
  let(:user) { User.create!(email_address: "an@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP", time_zone: "America/Bogota") }
  let(:checking) { household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance: "1000.0000", opening_balance_date: Date.new(2026, 1, 1)) }
  let(:card) { household.accounts.create!(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance: "-500.0000", opening_balance_date: Date.new(2026, 1, 1)) }
  let(:income_category) { household.categories.find_by!(kind: :income, name: "Salary") }
  let(:expense_category) { household.categories.find_by!(kind: :expense, name: "Fees") }

  before do
    HouseholdMembership.create!(user: user, household: household, role: :owner)
    checking
    card
  end

  def post_tx(account:, kind:, impact:, on:, category: nil, description: "tx")
    household.financial_transactions.create!(account: account, kind: kind, account_impact: impact, status: :posted, occurred_on: on, category: category, description: description)
  end

  def transfer(amount:, on: Date.new(2026, 1, 15))
    TransferService.create!(household: household, user: user, source_account_id: checking.id, destination_account_id: card.id, amount: amount).tap do |transfer|
      transfer.financial_transactions.update_all(occurred_on: on)
    end
  end

  def call(from: Date.new(2026, 1, 1), to: Date.new(2026, 2, 28), interval: "month", scope: "combined")
    described_class.call(household: household, user: user, scope: scope, from: from, to: to, interval: interval)
  end

  it "buckets income and expenses per interval and excludes transfers" do
    post_tx(account: checking, kind: :income, impact: "500", on: Date.new(2026, 1, 10), category: income_category)
    post_tx(account: checking, kind: :expense, impact: "-200", on: Date.new(2026, 2, 5), category: expense_category)
    transfer(amount: "100")

    result = call
    jan, feb = result.series

    expect(jan[:income]).to eq("500.0")
    expect(jan[:expenses]).to eq("0.0")
    expect(feb[:expenses]).to eq("200.0")
    expect(result.summary[:income]).to eq("500.0")
    expect(result.summary[:net_cash_flow]).to eq("300.0")
  end

  it "reconstructs bucket-end balances consistent with posted_balance" do
    transfer(amount: "100")

    jan = call.series.first
    expect(jan[:assets]).to eq("900.0")
    expect(jan[:liabilities]).to eq("400.0")
    expect(jan[:net_worth]).to eq("500.0")
    expect(jan[:debt]).to eq("400.0")
  end

  it "credits a reversal to its own bucket against the reversed kind" do
    original = post_tx(account: checking, kind: :expense, impact: "-80", on: Date.new(2026, 1, 10), category: expense_category)
    household.financial_transactions.create!(account: checking, kind: :balance_adjustment, account_impact: "80", status: :posted, occurred_on: Date.new(2026, 2, 3), reversal_of: original, description: "Reversal")

    result = call
    jan, feb = result.series
    expect(jan[:expenses]).to eq("80.0")
    expect(feb[:expenses]).to eq("-80.0")
    expect(result.summary[:expenses]).to eq("0.0")
  end

  it "attributes reversals to the original category in breakdowns" do
    original = post_tx(account: checking, kind: :expense, impact: "-80", on: Date.new(2026, 1, 10), category: expense_category)
    household.financial_transactions.create!(account: checking, kind: :balance_adjustment, account_impact: "80", status: :posted, occurred_on: Date.new(2026, 1, 12), reversal_of: original, description: "Reversal")

    entry = call.expense_breakdown.find { |row| row[:category_id] == expense_category.id }
    expect(entry[:total]).to eq("0.0")
  end

  it "handles category-less adjustments and pending rows safely" do
    post_tx(account: checking, kind: :balance_adjustment, impact: "25", on: Date.new(2026, 1, 20))
    household.financial_transactions.create!(account: checking, kind: :income, account_impact: "999", status: :pending, occurred_on: Date.new(2026, 1, 20), category: income_category, description: "pending")

    result = call
    expect(result.series.first[:income]).to eq("0.0")
    expect(result.series.first[:assets]).to eq("1025.0")
  end

  it "returns same-length previous-period totals and deltas" do
    post_tx(account: checking, kind: :income, impact: "500", on: Date.new(2026, 1, 10), category: income_category)
    post_tx(account: checking, kind: :income, impact: "200", on: Date.new(2025, 12, 31), category: income_category)

    result = call(from: Date.new(2026, 1, 1), to: Date.new(2026, 1, 31), interval: "month")
    expect(result.summary[:income]).to eq("500.0")
    expect(result.previous_period[:income]).to eq("200.0")
    expect(result.previous_period[:to]).to eq("2025-12-31")
    expect(result.comparison[:income_change]).to eq("300.0")
  end

  it "excludes other members' private accounts in every scope" do
    other = User.create!(email_address: "other@example.com", password: "password123")
    HouseholdMembership.create!(user: other, household: household, role: :member)
    private_account = household.accounts.create!(name: "Secret", account_type: :checking, currency_code: "COP", visibility: :private, private_owner: other, opening_balance: "700.0000", opening_balance_date: Date.new(2026, 1, 1))
    post_tx(account: private_account, kind: :income, impact: "700", on: Date.new(2026, 1, 5), category: income_category)

    result = call
    expect(result.summary[:income]).to eq("0.0")
    expect(result.series.first[:assets]).to eq("1000.0")
  end

  it "includes own private accounts in combined and private scopes only" do
    private_account = household.accounts.create!(name: "Mine", account_type: :checking, currency_code: "COP", visibility: :private, private_owner: user, opening_balance: "50.0000", opening_balance_date: Date.new(2026, 1, 1))

    expect(call(scope: "shared").series.first[:assets]).to eq("1000.0")
    expect(call(scope: "private").series.first[:assets]).to eq("50.0")
    expect(call.series.first[:assets]).to eq("1050.0")
  end

  it "emits a per-account debt series for liabilities" do
    transfer(amount: "100")

    series = call.debt_series.find { |row| row[:account_id] == card.id }
    expect(series[:points].first[:balance]).to eq("400.0")
    expect(series[:has_profile]).to be(false)
  end

  it "rejects invalid scope, interval, and oversized ranges" do
    expect { call(scope: "everyone") }.to raise_error(ArgumentError)
    expect { call(interval: "year") }.to raise_error(ArgumentError)
    expect { call(from: Date.new(2020, 1, 1), to: Date.new(2026, 1, 1), interval: "day") }.to raise_error(ArgumentError)
    expect { call(from: Date.new(2026, 2, 1), to: Date.new(2026, 1, 1)) }.to raise_error(ArgumentError)
  end

  it "bounds query count for wide ranges" do
    post_tx(account: checking, kind: :income, impact: "10", on: Date.new(2026, 1, 10), category: income_category)
    queries = 0
    counter = ->(_name, _start, _finish, _id, payload) { queries += 1 unless %w[SCHEMA EXPLAIN CACHE].include?(payload[:name].to_s) }
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record") { call(from: Date.new(2026, 1, 1), to: Date.new(2026, 12, 31), interval: "day") }
    expect(queries).to be <= 8
  end
end
