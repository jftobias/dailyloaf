require "rails_helper"

RSpec.describe Account, type: :model do
  let(:user) { User.create!(email_address: "account-owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }

  before { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "requires the household base currency" do
    account = household.accounts.new(name: "Checking", account_type: :checking, currency_code: "USD", opening_balance_date: Date.current)

    expect(account).not_to be_valid
    expect(account.errors[:currency_code]).to include("must match the household currency")
  end

  it "requires a member as the private owner" do
    account = household.accounts.new(name: "Private", account_type: :checking, currency_code: "COP", visibility: :private, private_owner: user, opening_balance_date: Date.current)

    expect(account).to be_valid
  end

  it "does not mutate an opening balance after financial activity" do
    account = household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current)
    category = household.categories.find_by!(name: "Salary")
    account.financial_transactions.create!(household: household, category: category, kind: :income, account_impact: "1.0000", status: :posted, occurred_on: Date.current, description: "Salary")
    account.opening_balance = "10.0000"

    expect(account).not_to be_valid
  end

  it "calculates posted, pending, and projected balances" do
    account = household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance: "100.0000", opening_balance_date: Date.current)
    category = household.categories.find_by!(name: "Groceries")
    account.financial_transactions.create!(household: household, category: category, kind: :expense, account_impact: "-20.0000", status: :posted, occurred_on: Date.current, description: "Food")
    account.financial_transactions.create!(household: household, category: category, kind: :expense, account_impact: "-5.0000", status: :pending, occurred_on: Date.current, description: "Pending food")

    expect(account.reload.posted_balance.to_s).to eq("80.0")
    expect(account.pending_impact.to_s).to eq("-5.0")
    expect(account.projected_balance.to_s).to eq("75.0")
  end

  it "requires canonical negative opening balances on liabilities" do
    card = household.accounts.new(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance: "500.0000", opening_balance_date: Date.current)
    expect(card).not_to be_valid
    expect(card.errors[:opening_balance]).not_to be_empty

    card.opening_balance = "-500.0000"
    expect(card).to be_valid
  end

  it "requires non-negative opening balances on assets" do
    account = household.accounts.new(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance: "-500.0000", opening_balance_date: Date.current)
    expect(account).not_to be_valid
  end

  it "allows a credit limit only on credit-card accounts" do
    card = household.accounts.new(name: "Card", account_type: :credit_card, currency_code: "COP", credit_limit: "2000.0000", opening_balance_date: Date.current)
    expect(card).to be_valid

    loan = household.accounts.new(name: "Loan", account_type: :loan, currency_code: "COP", credit_limit: "2000.0000", opening_balance_date: Date.current)
    expect(loan).not_to be_valid
    expect(loan.errors[:credit_limit]).not_to be_empty

    checking = household.accounts.new(name: "Checking", account_type: :checking, currency_code: "COP", credit_limit: "2000.0000", opening_balance_date: Date.current)
    expect(checking).not_to be_valid
  end

  it "rejects zero and negative credit limits" do
    card = household.accounts.new(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance_date: Date.current)
    card.credit_limit = "0.0000"
    expect(card).not_to be_valid
    card.credit_limit = "-1.0000"
    expect(card).not_to be_valid
  end
end
