class Household < ApplicationRecord
  has_many :household_memberships, dependent: :destroy
  has_many :users, through: :household_memberships
  has_many :accounts, dependent: :destroy
  has_many :categories, dependent: :destroy
  has_many :financial_transactions, dependent: :restrict_with_exception
  has_many :transfers, dependent: :restrict_with_exception
  has_many :debt_profiles, dependent: :destroy
  after_create :provision_default_categories

  normalizes :currency_code, with: ->(code) { code.to_s.strip.upcase }

  validates :name, presence: true
  validates :currency_code, presence: true, format: { with: /\A[A-Z]{3}\z/ }
  validates :time_zone, presence: true
  validate :time_zone_is_iana

  private

  def provision_default_categories
    DefaultCategoryProvisioner.call(self)
  rescue ActiveRecord::StatementInvalid
    raise
  end

  def time_zone_is_iana
    return if time_zone.blank?
    TZInfo::Timezone.get(time_zone)
  rescue TZInfo::InvalidTimezoneIdentifier
    errors.add(:time_zone, "must be a valid IANA time zone")
  end
end
