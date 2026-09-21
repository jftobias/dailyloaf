require "rails_helper"

RSpec.describe User, type: :model do
  it "normalizes email addresses" do
    user = described_class.create!(email_address: " Person@Example.COM ", password: "password123")

    expect(user.email_address).to eq("person@example.com")
  end

  it "requires a unique email address" do
    described_class.create!(email_address: "person@example.com", password: "password123")

    duplicate = described_class.new(email_address: "PERSON@example.com", password: "password123")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:email_address]).to include("has already been taken")
  end
end
