class OverviewService
  SCOPES = %w[shared private combined].freeze

  def self.call(household:, user:, scope:, from:, to:)
    raise ArgumentError, "Invalid overview scope" unless SCOPES.include?(scope)

    accounts = visible_accounts(household, user, scope)
    account_ids = accounts.pluck(:id)
    transactions = household.financial_transactions.where(account_id: account_ids).posted_in(from, to).includes(:category, :reversal_of)
    balances = accounts.each_with_object({}) { |account, result| result[account.id] = account.opening_balance }
    household.financial_transactions.where(account_id: account_ids, status: :posted).group(:account_id).sum(:account_impact).each { |id, amount| balances[id] += amount }
    assets = accounts.select(&:asset?).sum { |account| balances[account.id] }
    liabilities = accounts.select(&:liability?).sum { |account| -balances[account.id] }
    income = transactions.sum { |transaction| transaction.income? ? transaction.account_impact : transaction.reversal_of&.income? ? transaction.account_impact : 0 }
    expenses = transactions.sum { |transaction| transaction.expense? ? -transaction.account_impact : transaction.reversal_of&.expense? ? -transaction.account_impact : 0 }

    {
      scope: scope,
      from: from.to_s,
      to: to.to_s,
      total_assets: decimal(assets),
      total_liabilities: decimal(liabilities),
      net_worth: decimal(assets - liabilities),
      income: decimal(income),
      expenses: decimal(expenses),
      cash_flow: decimal(income - expenses),
      account_balances: accounts.index_with { |account| decimal(balances[account.id]) }.transform_keys(&:to_s),
      category_totals: transactions.select { |transaction| transaction.income? || transaction.expense? || transaction.reversal_of&.income? || transaction.reversal_of&.expense? }.group_by { |transaction| transaction.category || transaction.reversal_of.category }.each_with_object({}) { |(category, entries), result| result[category.id.to_s] = decimal(entries.sum { |entry| entry.income? || entry.reversal_of&.income? ? entry.account_impact : -entry.account_impact }) }
    }
  end

  def self.visible_accounts(household, user, scope)
    case scope
    when "shared" then household.accounts.where(visibility: :shared)
    when "private" then household.accounts.where(visibility: :private, private_owner_id: user.id)
    else household.accounts.where(visibility: :shared).or(household.accounts.where(visibility: :private, private_owner_id: user.id))
    end
  end
  private_class_method :visible_accounts

  def self.decimal(value)
    BigDecimal(value.to_s).to_s("F")
  end
  private_class_method :decimal
end
