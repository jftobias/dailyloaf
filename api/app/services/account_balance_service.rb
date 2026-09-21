class AccountBalanceService
  def self.for(accounts)
    ids = accounts.map(&:id)
    posted = FinancialTransaction.where(account_id: ids, status: :posted).group(:account_id).sum(:account_impact)
    pending = FinancialTransaction.where(account_id: ids, status: :pending).group(:account_id).sum(:account_impact)

    accounts.index_with do |account|
      posted_balance = account.opening_balance + posted.fetch(account.id, 0)
      pending_impact = pending.fetch(account.id, 0)
      { posted_balance: posted_balance, pending_impact: pending_impact, projected_balance: posted_balance + pending_impact }
    end
  end
end
