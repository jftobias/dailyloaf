require "rails_helper"

RSpec.describe RegistrationService do
  it "creates the user, household, owner membership, and session atomically" do
    result = described_class.call(
      email_address: "person@example.com",
      password: "password123",
      household_name: "Home"
    )

    expect(result.user).to be_persisted
    expect(result.household).to be_persisted
    expect(result.membership).to be_owner
    expect(result.session).to be_persisted
    expect(result.session.user).to eq(result.user)
    expect(result.session.token_digest).not_to eq(result.session.raw_token)
    expect(Session.column_names).not_to include("raw_token")
  end

  it "rolls back all records when onboarding fails" do
    counts_before = [ User.count, Household.count, HouseholdMembership.count, Session.count ]

    expect do
      described_class.call(
        email_address: "person@example.com",
        password: "password123",
        household_name: ""
      )
    end.to raise_error(ActiveRecord::RecordInvalid)

    expect([ User.count, Household.count, HouseholdMembership.count, Session.count ]).to eq(counts_before)
  end
end
