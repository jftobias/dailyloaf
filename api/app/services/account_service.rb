class AccountService
  def self.create!(household:, user:, attributes:)
    account = household.accounts.new(attributes)
    account.private_owner = user if account.visibility_private?
    account.currency_code = attributes[:currency_code].presence || household.currency_code
    account.save!
    account
  end

  def self.archive!(account)
    account.update!(archived_at: Time.current)
  end
end
