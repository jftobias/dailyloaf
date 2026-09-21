require "rails_helper"

RSpec.describe FinancialTransaction, type: :model do
  let(:user) { User.create!(email_address: "transaction-owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }
  let(:account) { household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current) }

  before { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "requires category and sign semantics for income and expenses" do
    income = account.financial_transactions.new(household: household, kind: :income, account_impact: "-1.0000", status: :posted, occurred_on: Date.current, description: "Invalid")

    expect(income).not_to be_valid
    expect(income.errors[:account_impact]).to include("must be positive for income")
    expect(income.errors[:category]).to include("is required for income and expense")
  end

  it "does not allow direct mutation of posted transactions" do
    category = household.categories.find_by!(name: "Salary")
    transaction = account.financial_transactions.create!(household: household, category: category, kind: :income, account_impact: "1.0000", status: :posted, occurred_on: Date.current, description: "Salary")

    transaction.description = "Changed"

    expect(transaction).not_to be_valid
  end
end
