require "rails_helper"

RSpec.describe Category, type: :model do
  let(:user) { User.create!(email_address: "category-owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }

  before { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "provisions the approved defaults once per household" do
    expect(household.categories.where(is_default: true).count).to eq(22)
    expect(household.categories.where(kind: :income).pluck(:name)).to match_array([ "Salary", "Freelance & business", "Interest & dividends", "Gifts & support", "Other income" ])
    DefaultCategoryProvisioner.call(household)
    expect(household.categories.where(is_default: true).count).to eq(22)
  end

  it "supports private custom categories for members" do
    category = household.categories.create!(name: "Private care", kind: :expense, visibility: :private, private_owner: user)

    expect(category).to be_visibility_private
    expect(household.categories.available_to(user)).to include(category)
  end
end
