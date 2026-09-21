class FinancialTransaction < ApplicationRecord
  KINDS = %w[income expense transfer balance_adjustment].freeze
  STATUSES = %w[pending posted].freeze

  enum :kind, KINDS.index_with(&:to_s), validate: true
  enum :status, STATUSES.index_with(&:to_s), validate: true

  belongs_to :household
  belongs_to :account
  belongs_to :category, optional: true
  belongs_to :transfer, optional: true
  belongs_to :reversal_of, class_name: "FinancialTransaction", optional: true
  belongs_to :replacement_for, class_name: "FinancialTransaction", optional: true

  has_one :reversal, class_name: "FinancialTransaction", foreign_key: :reversal_of_id, dependent: :restrict_with_exception
  has_one :replacement, class_name: "FinancialTransaction", foreign_key: :replacement_for_id, dependent: :restrict_with_exception

  validates :account_impact, numericality: true
  validates :occurred_on, :description, presence: true
  validate :kind_sign_is_valid
  validate :category_matches_kind
  validate :transfer_has_aggregate
  validate :category_matches_account_visibility
  validate :account_matches_household
  validate :posted_records_are_immutable, on: :update
  validate :transfer_leg_is_immutable, on: :update
  before_destroy :prevent_posted_destroy
  before_destroy :prevent_transfer_leg_destroy

  scope :posted_in, ->(from, to) { where(status: :posted, occurred_on: from..to) }

  private

  def kind_sign_is_valid
    return if account_impact.blank?
    errors.add(:account_impact, "must be positive for income") if income? && account_impact <= 0
    errors.add(:account_impact, "must be negative for expense") if expense? && account_impact >= 0
  end

  def category_matches_kind
    if %w[income expense].include?(kind) && category.blank?
      errors.add(:category, "is required for income and expense")
    elsif %w[transfer balance_adjustment].include?(kind) && category.present?
      errors.add(:category, "must be blank for transfers and adjustments")
    elsif category.present? && category.kind != kind
      errors.add(:category, "must match the transaction kind")
    end
  end

  def transfer_has_aggregate
    errors.add(:transfer, "is required for transfer legs") if transfer? && transfer.blank?
  end

  def category_matches_account_visibility
    return if account.blank? || category.blank?
    if account.visibility_shared? && category.visibility_private?
      errors.add(:category, "must be shared for a shared account")
    elsif account.visibility_private? && category.visibility_private? && category.private_owner_id != account.private_owner_id
      errors.add(:category, "must belong to the private account owner")
    end
  end

  def account_matches_household
    return if account.blank? || household.blank?
    errors.add(:account, "must belong to the household") unless account.household_id == household_id
  end

  def posted_records_are_immutable
    errors.add(:base, "posted transactions are immutable; use a correction") if status_in_database == "posted" && changed?
  end

  def transfer_leg_is_immutable
    errors.add(:transfer, "legs are managed through the transfer aggregate") if transfer_id.present? && changed?
  end

  def prevent_posted_destroy
    throw(:abort) if posted?
  end

  def prevent_transfer_leg_destroy
    throw(:abort) if transfer_id.present?
  end
end
