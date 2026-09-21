class Account < ApplicationRecord
  ASSET_TYPES = %w[cash checking savings investment other_asset].freeze
  LIABILITY_TYPES = %w[credit_card loan other_liability].freeze
  ACCOUNT_TYPES = (ASSET_TYPES + LIABILITY_TYPES).freeze

  enum :account_type, ACCOUNT_TYPES.index_with(&:to_s), validate: true
  enum :visibility, { shared: "shared", private: "private" }, validate: true, prefix: true

  belongs_to :household
  belongs_to :private_owner, class_name: "User", optional: true
  has_many :financial_transactions, dependent: :restrict_with_exception
  has_many :source_transfers, class_name: "Transfer", foreign_key: :source_account_id, dependent: :restrict_with_exception
  has_many :destination_transfers, class_name: "Transfer", foreign_key: :destination_account_id, dependent: :restrict_with_exception

  normalizes :currency_code, with: ->(code) { code.to_s.strip.upcase }

  validates :name, presence: true
  validates :currency_code, presence: true, format: { with: /\A[A-Z]{3}\z/ }
  validates :opening_balance, numericality: true
  validates :opening_balance_date, presence: true
  validate :currency_matches_household
  validate :private_owner_matches_visibility
  validate :private_owner_is_member
  validate :opening_balance_immutable, on: :update

  def asset?
    ASSET_TYPES.include?(account_type)
  end

  def liability?
    LIABILITY_TYPES.include?(account_type)
  end

  def posted_balance
    opening_balance + financial_transactions.where(status: :posted).sum(:account_impact)
  end

  def pending_impact
    financial_transactions.where(status: :pending).sum(:account_impact)
  end

  def projected_balance
    posted_balance + pending_impact
  end

  def archived?
    archived_at.present?
  end

  def visible_to?(user)
    visibility_shared? || private_owner_id == user.id
  end

  private

  def currency_matches_household
    return if household.blank? || currency_code.blank?
    errors.add(:currency_code, "must match the household currency") unless currency_code == household.currency_code
  end

  def private_owner_matches_visibility
    if visibility_private? && private_owner_id.blank?
      errors.add(:private_owner, "is required for private accounts")
    elsif visibility_shared? && private_owner_id.present?
      errors.add(:private_owner, "must be blank for shared accounts")
    end
  end

  def opening_balance_immutable
    return unless opening_balance_changed? || opening_balance_date_changed?
    errors.add(:opening_balance, "must be corrected with a balance adjustment after financial activity") if financial_transactions.exists?
  end

  def private_owner_is_member
    return if private_owner_id.blank? || household.blank?
    unless household.household_memberships.exists?(user_id: private_owner_id)
      errors.add(:private_owner, "must belong to the household")
    end
  end
end
