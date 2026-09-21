class User < ApplicationRecord
  has_secure_password

  has_many :sessions, dependent: :destroy
  has_many :household_memberships, dependent: :destroy
  has_many :households, through: :household_memberships
  has_many :private_accounts, class_name: "Account", foreign_key: :private_owner_id, dependent: :restrict_with_exception
  has_many :private_categories, class_name: "Category", foreign_key: :private_owner_id, dependent: :restrict_with_exception

  normalizes :email_address, with: ->(email) { email.to_s.strip.downcase }

  validates :email_address, presence: true, uniqueness: true
  validates :password, length: { minimum: 8 }, if: -> { password.present? }
end
