class Category < ApplicationRecord
  KINDS = %w[income expense].freeze

  enum :kind, KINDS.index_with(&:to_s), validate: true
  enum :visibility, { shared: "shared", private: "private" }, validate: true, prefix: true

  belongs_to :household
  belongs_to :private_owner, class_name: "User", optional: true
  has_many :financial_transactions, dependent: :restrict_with_exception

  validates :name, presence: true
  validates :name, uniqueness: { scope: %i[household_id kind private_owner_id] }
  validate :private_owner_matches_visibility
  validate :private_owner_is_member

  scope :active, -> { where(archived_at: nil) }
  scope :available_to, ->(user) { where(visibility: :shared).or(where(visibility: :private, private_owner_id: user.id)) }

  def archived?
    archived_at.present?
  end

  def used?
    financial_transactions.where(status: :posted).exists?
  end

  private

  def private_owner_matches_visibility
    if visibility_private? && private_owner_id.blank?
      errors.add(:private_owner, "is required for private categories")
    elsif visibility_shared? && private_owner_id.present?
      errors.add(:private_owner, "must be blank for shared categories")
    end
  end

  def private_owner_is_member
    return if private_owner_id.blank? || household.blank?
    unless household.household_memberships.exists?(user_id: private_owner_id)
      errors.add(:private_owner, "must belong to the household")
    end
  end
end
