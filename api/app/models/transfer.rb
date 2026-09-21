class Transfer < ApplicationRecord
  enum :status, { pending: "pending", posted: "posted" }, validate: true

  belongs_to :household
  belongs_to :source_account, class_name: "Account"
  belongs_to :destination_account, class_name: "Account"
  belongs_to :reversal_of, class_name: "Transfer", optional: true

  has_one :reversal, class_name: "Transfer", foreign_key: :reversal_of_id, dependent: :restrict_with_exception
  has_many :financial_transactions, dependent: :restrict_with_exception

  validates :amount, numericality: { greater_than: 0 }
  validates :currency_code, format: { with: /\A[A-Z]{3}\z/ }
  validate :accounts_are_compatible

  private

  def accounts_are_compatible
    return if source_account.blank? || destination_account.blank?
    errors.add(:destination_account, "must differ from the source account") if source_account_id == destination_account_id
    errors.add(:base, "accounts must belong to the household") unless source_account.household_id == household_id && destination_account.household_id == household_id
    errors.add(:base, "accounts must use the household currency") unless source_account.currency_code == currency_code && destination_account.currency_code == currency_code
    if source_account.visibility_private? != destination_account.visibility_private?
      errors.add(:base, "private and shared accounts cannot be transferred between")
    elsif source_account.visibility_private? && source_account.private_owner_id != destination_account.private_owner_id
      errors.add(:base, "private accounts must belong to the same user")
    end
  end
end
