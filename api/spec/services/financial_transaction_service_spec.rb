require "rails_helper"

RSpec.describe FinancialTransactionService do
  let(:user) { User.create!(email_address: "ledger-owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }
  let(:account) { household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current) }
  let(:category) { household.categories.find_by!(name: "Salary") }

  before { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "creates signed income and expense impacts" do
    income = described_class.create!(household: household, user: user, attributes: { account_id: account.id, category_id: category.id, kind: :income, account_impact: "1000.0000", occurred_on: Date.current, description: "Salary", status: :posted })

    expect(income.account_impact.to_s).to eq("1000.0")
    expect(account.reload.posted_balance.to_s).to eq("1000.0")
  end

  it "corrects a posted transaction with a reversal and replacement" do
    expense_category = household.categories.find_by!(name: "Groceries")
    original = described_class.create!(household: household, user: user, attributes: { account_id: account.id, category_id: expense_category.id, kind: :expense, account_impact: "-100.0000", occurred_on: Date.current, description: "Food", status: :posted })

    reversal, replacement = described_class.correct!(transaction: original, user: user, attributes: { category_id: expense_category.id, kind: :expense, account_impact: "-80.0000", occurred_on: Date.current, description: "Corrected food", status: :posted })

    expect(reversal.reversal_of).to eq(original)
    expect(replacement.replacement_for).to eq(original)
    expect(account.reload.posted_balance.to_s).to eq("-80.0")
    expect { described_class.reverse!(transaction: original) }.to raise_error(ActiveRecord::RecordInvalid)
  end

  it "rejects an idempotency key reused with different parameters" do
    attributes = { account_id: account.id, category_id: category.id, kind: :income, account_impact: "25.0000", occurred_on: Date.current, description: "Interest", status: :posted }
    described_class.create!(household: household, user: user, attributes: attributes, idempotency_key: "key-conflict")

    expect do
      described_class.create!(household: household, user: user, attributes: attributes.merge(account_impact: "26.0000"), idempotency_key: "key-conflict")
    end.to raise_error(ActiveRecord::RecordInvalid, /Idempotency key/)
  end

  it "returns the same transaction for an idempotent retry" do
    attributes = { account_id: account.id, category_id: category.id, kind: :income, account_impact: "25.0000", occurred_on: Date.current, description: "Interest", status: :posted }
    first = described_class.create!(household: household, user: user, attributes: attributes, idempotency_key: "key-1")
    second = described_class.create!(household: household, user: user, attributes: attributes, idempotency_key: "key-1")

    expect(second.id).to eq(first.id)
    expect(FinancialTransaction.where(idempotency_key: "key-1").count).to eq(1)
  end
end
