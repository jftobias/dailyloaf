require "rails_helper"

RSpec.describe OverviewService do
  let(:owner) { User.create!(email_address: "overview-owner@example.com", password: "password123") }
  let(:member) { User.create!(email_address: "overview-member@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }

  before do
    HouseholdMembership.create!(user: owner, household: household, role: :owner)
    HouseholdMembership.create!(user: member, household: household, role: :member)
  end

  it "returns shared, private, and combined scopes without leaking private values" do
    shared = household.accounts.create!(name: "Shared", account_type: :checking, currency_code: "COP", opening_balance_date: Date.current)
    private_account = household.accounts.create!(name: "Private", account_type: :checking, currency_code: "COP", visibility: :private, private_owner: owner, opening_balance_date: Date.current)
    salary = household.categories.find_by!(name: "Salary")
    shared.financial_transactions.create!(household: household, category: salary, kind: :income, account_impact: "100.0000", status: :posted, occurred_on: Date.current, description: "Shared income")
    private_account.financial_transactions.create!(household: household, category: salary, kind: :income, account_impact: "50.0000", status: :posted, occurred_on: Date.current, description: "Private income")

    shared_result = described_class.call(household: household, user: member, scope: "shared", from: Date.current.beginning_of_month, to: Date.current)
    private_result = described_class.call(household: household, user: member, scope: "private", from: Date.current.beginning_of_month, to: Date.current)
    combined_result = described_class.call(household: household, user: owner, scope: "combined", from: Date.current.beginning_of_month, to: Date.current)

    expect(shared_result[:income]).to eq("100.0")
    expect(private_result[:income]).to eq("0.0")
    expect(combined_result[:income]).to eq("150.0")
  end
end
