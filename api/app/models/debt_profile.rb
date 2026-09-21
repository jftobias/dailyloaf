class DebtProfile < ApplicationRecord
  belongs_to :household
  belongs_to :account

  normalizes :creditor_name, with: ->(name) { name.to_s.strip.presence }

  validates :annual_interest_rate, numericality: { greater_than_or_equal_to: 0, less_than: 1000 }
  validates :minimum_payment, numericality: { greater_than_or_equal_to: 0 }
  validates :planned_monthly_payment, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :payment_due_day, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 31 }, allow_nil: true
  validates :original_principal, numericality: { greater_than: 0 }, allow_nil: true
  validate :account_is_liability
  validate :account_matches_household

  private

  def account_is_liability
    return if account.blank?
    errors.add(:account, "must be a liability account") unless account.liability?
  end

  def account_matches_household
    return if account.blank? || household.blank?
    errors.add(:account, "must belong to the household") unless account.household_id == household_id
  end
end
