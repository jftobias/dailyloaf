class AccountService
  def self.create!(household:, user:, attributes:)
    account = household.accounts.new(attributes.except(:opening_balance))
    account.private_owner = user if account.visibility_private?
    account.currency_code = attributes[:currency_code].presence || household.currency_code
    account.opening_balance = canonical_opening_balance(account, attributes[:opening_balance])
    account.save!
    account
  end

  # Normalization boundary: the API receives a non-negative user-facing
  # amount ("amount currently owed" for liabilities) and converts it to the
  # canonical signed ledger value for the account type.
  def self.canonical_opening_balance(account, value)
    amount =
      begin
        BigDecimal(value.to_s.strip.presence || "0")
      rescue ArgumentError, TypeError
        nil
      end
    raise ActiveRecord::RecordInvalid.new(account), "Opening balance is invalid" if amount.nil?
    raise ActiveRecord::RecordInvalid.new(account), "Opening balance cannot be negative" if amount.negative?
    account.liability? ? -amount : amount
  end
  private_class_method :canonical_opening_balance

  def self.archive!(account)
    account.update!(archived_at: Time.current)
  end
end
