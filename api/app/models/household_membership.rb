class HouseholdMembership < ApplicationRecord
  enum :role, { owner: "owner", member: "member" }, validate: true

  belongs_to :user
  belongs_to :household

  validates :user_id, uniqueness: { scope: :household_id }
  validates :role, presence: true
end
