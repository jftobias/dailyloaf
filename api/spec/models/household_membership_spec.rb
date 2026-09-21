require "rails_helper"

RSpec.describe HouseholdMembership, type: :model do
  let(:user) { User.create!(email_address: "person@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }

  it "allows only owner and member roles" do
    expect(described_class.new(user: user, household: household, role: "guest")).not_to be_valid
  end

  it "prevents duplicate user memberships" do
    described_class.create!(user: user, household: household, role: :member)
    duplicate = described_class.new(user: user, household: household, role: :member)

    expect(duplicate).not_to be_valid
  end
end
