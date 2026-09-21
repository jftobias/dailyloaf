require "rails_helper"

RSpec.describe DebtProfile do
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }
  let(:liability) { household.accounts.create!(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance: "-500.0000", opening_balance_date: Date.current) }
  let(:asset) { household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance: "100.0000", opening_balance_date: Date.current) }

  it "persists a valid profile on a liability account" do
    profile = described_class.create!(household: household, account: liability, creditor_name: "Bank", annual_interest_rate: "24.5", minimum_payment: "50.0000", planned_monthly_payment: "120.0000", payment_due_day: 15, original_principal: "800.0000")

    expect(profile).to be_persisted
    expect(profile.annual_interest_rate.to_s).to eq("24.5")
  end

  it "rejects profiles on asset accounts" do
    profile = described_class.new(household: household, account: asset, minimum_payment: "10.0000")

    expect(profile).not_to be_valid
    expect(profile.errors[:account]).to include("must be a liability account")
  end

  it "rejects a profile whose account belongs to another household" do
    other = Household.create!(name: "Other", currency_code: "COP").accounts.create!(name: "Card", account_type: :loan, currency_code: "COP", opening_balance_date: Date.current)
    profile = described_class.new(household: household, account: other, minimum_payment: "10.0000")

    expect(profile).not_to be_valid
    expect(profile.errors[:account]).to include("must belong to the household")
  end

  it "enforces one profile per account" do
    described_class.create!(household: household, account: liability, minimum_payment: "10.0000")

    expect do
      described_class.create!(household: household, account: liability, minimum_payment: "20.0000")
    end.to raise_error(ActiveRecord::RecordNotUnique)
  end

  it "rejects negative payments, invalid due days, and non-positive principal" do
    expect(described_class.new(household: household, account: liability, minimum_payment: "-1")).not_to be_valid
    expect(described_class.new(household: household, account: liability, minimum_payment: "1", planned_monthly_payment: "-1")).not_to be_valid
    expect(described_class.new(household: household, account: liability, minimum_payment: "1", annual_interest_rate: "-0.5")).not_to be_valid
    expect(described_class.new(household: household, account: liability, minimum_payment: "1", payment_due_day: 0)).not_to be_valid
    expect(described_class.new(household: household, account: liability, minimum_payment: "1", payment_due_day: 32)).not_to be_valid
    expect(described_class.new(household: household, account: liability, minimum_payment: "1", original_principal: "0")).not_to be_valid
  end

  it "survives account archival and is destroyed with the account" do
    profile = described_class.create!(household: household, account: liability, minimum_payment: "10.0000")
    liability.update!(archived_at: Time.current)
    expect(profile.reload).to be_persisted
  end
end
