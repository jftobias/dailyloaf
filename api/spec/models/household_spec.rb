require "rails_helper"

RSpec.describe Household, type: :model do
  it "normalizes uppercase currency codes" do
    household = described_class.create!(name: "Home", currency_code: " cop ")

    expect(household.currency_code).to eq("COP")
  end

  it "requires an ISO 4217-style currency code" do
    household = described_class.new(name: "Home", currency_code: "US")

    expect(household).not_to be_valid
  end
end
