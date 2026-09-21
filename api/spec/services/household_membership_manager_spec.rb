require "rails_helper"

RSpec.describe HouseholdMembershipManager do
  let(:user) { User.create!(email_address: "owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }
  let!(:membership) { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "prevents removing the final owner" do
    expect { described_class.remove!(membership) }.to raise_error(ActiveRecord::RecordInvalid)
    expect(membership.reload).to be_owner
  end

  it "prevents demoting the final owner" do
    expect { described_class.update_role!(membership, :member) }.to raise_error(ActiveRecord::RecordInvalid)
    expect(membership.reload).to be_owner
  end

  it "allows removing an owner when another owner remains" do
    second_user = User.create!(email_address: "second@example.com", password: "password123")
    HouseholdMembership.create!(user: second_user, household: household, role: :owner)

    expect { described_class.remove!(membership) }.to change(HouseholdMembership, :count).by(-1)
  end
end
