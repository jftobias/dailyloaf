# Deterministic household analytics (MVP).
#
# - Posted records only. Transfer legs never count as income/expense.
# - Reversal rows (balance_adjustment linked via reversal_of) count in their
#   own occurred_on bucket against the reversed record's kind/category —
#   identical to OverviewService semantics.
# - Bucket-end balances are reconstructed as opening_balance (when the bucket
#   end is on/after opening_balance_date) plus posted impacts with
#   occurred_on <= bucket end.
# - Bounded queries: account list + grouped sums; no per-bucket fan-out.
class AnalyticsService
  SCOPES = %w[shared private combined].freeze
  INTERVALS = %w[day week month].freeze
  MAX_RANGE_DAYS = 5 * 366
  MAX_BUCKETS = 370

  Result = Struct.new(:accounts, :series, :summary, :previous_period, :comparison, :income_breakdown, :expense_breakdown, :debt_series, keyword_init: true)

  def self.call(household:, user:, scope:, from:, to:, interval:)
    raise ArgumentError, "Invalid analytics scope" unless SCOPES.include?(scope.to_s)
    raise ArgumentError, "Invalid analytics interval" unless INTERVALS.include?(interval.to_s)
    raise ArgumentError, "Invalid date range" unless from.is_a?(Date) && to.is_a?(Date) && from <= to
    raise ArgumentError, "Date range too large" if (to - from).to_i + 1 > MAX_RANGE_DAYS

    buckets = build_buckets(from, to, interval.to_s)
    raise ArgumentError, "Date range produces too many buckets" if buckets.size > MAX_BUCKETS

    accounts = visible_accounts(household, user, scope.to_s).includes(:debt_profile).to_a
    account_ids = accounts.map(&:id)

    impacts = balance_impacts(household, account_ids, to)
    activity = range_activity(household, account_ids, buckets.first.first, to)

    # Group each account's impacts sorted by date once, so bucket-end
    # reconstruction is a filtered sum per account instead of a hash scan.
    impacts_by_account = impacts.each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |((account_id, occurred_on), amount), grouped|
      grouped[account_id] << [ occurred_on, amount ]
    end
    impacts_by_account.each_value { |entries| entries.sort_by!(&:first) }

    series = buckets.map do |bucket_start, bucket_end|
      totals = flow_totals(activity, bucket_start, bucket_end)
      balances = balance_at(accounts, impacts_by_account, bucket_end)
      totals.merge(
        start: bucket_start.to_s,
        end: bucket_end.to_s,
        net_cash_flow: decimal(big(totals[:income]) - big(totals[:expenses])),
        assets: decimal(balances[:assets]),
        liabilities: decimal(balances[:liabilities]),
        net_worth: decimal(balances[:assets] - balances[:liabilities]),
        debt: decimal(balances[:liabilities])
      )
    end

    summary = flow_totals(activity, from, to)
    prev_to = from - 1
    prev_from = prev_to - (to - from).to_i
    previous = flow_totals(range_activity(household, account_ids, prev_from, prev_to), prev_from, prev_to)

    Result.new(
      accounts: accounts,
      series: series,
      summary: summary.merge(net_cash_flow: decimal(big(summary[:income]) - big(summary[:expenses]))),
      previous_period: previous.merge(from: prev_from.to_s, to: prev_to.to_s, net_cash_flow: decimal(big(previous[:income]) - big(previous[:expenses]))),
      comparison: {
        income_change: decimal(big(summary[:income]) - big(previous[:income])),
        expenses_change: decimal(big(summary[:expenses]) - big(previous[:expenses])),
        net_cash_flow_change: decimal(big(summary[:income]) - big(summary[:expenses]) - big(previous[:income]) + big(previous[:expenses]))
      },
      income_breakdown: category_breakdown(activity, from, to, :income),
      expense_breakdown: category_breakdown(activity, from, to, :expense),
      debt_series: liability_series(accounts, impacts_by_account, buckets)
    )
  end

  def self.build_buckets(from, to, interval)
    case interval
    when "day" then (from..to).map { |day| [ day, day ] }
    when "week"
      first = from.beginning_of_week
      buckets = []
      start = first
      while start <= to
        buckets << [ [ start, from ].max, [ start.end_of_week, to ].min ]
        start = start.next_week
      end
      buckets
    when "month"
      buckets = []
      start = from.beginning_of_month
      while start <= to
        buckets << [ [ start, from ].max, [ start.end_of_month, to ].min ]
        start = start.next_month
      end
      buckets
    end
  end
  private_class_method :build_buckets

  # Grouped posted impacts per account per day for balance reconstruction.
  def self.balance_impacts(household, account_ids, to)
    return {} if account_ids.empty?
    household.financial_transactions
      .where(account_id: account_ids, status: :posted)
      .where("occurred_on <= ?", to)
      .group(:account_id, :occurred_on)
      .sum(:account_impact)
  end
  private_class_method :balance_impacts

  # Posted income/expense rows and reversal rows (balance_adjustment whose
  # reversal_of is income/expense) inside [from, to], eager-loading the
  # categories needed for breakdowns.
  def self.range_activity(household, account_ids, from, to)
    return [] if account_ids.empty?
    household.financial_transactions
      .where(account_id: account_ids, status: :posted, occurred_on: from..to)
      .where(kind: %w[income expense balance_adjustment])
      .includes(:category, reversal_of: :category)
      .to_a
  end
  private_class_method :range_activity

  # Maps a row to the effective flow kind: income/expense rows keep their kind;
  # balance_adjustment reversals adopt the reversed row's kind when that is
  # income or expense; everything else (transfers, plain adjustments) is nil.
  def self.flow_kind(transaction)
    return transaction.kind.to_sym if transaction.income? || transaction.expense?
    original_kind = transaction.reversal_of&.kind
    original_kind.to_sym if %w[income expense].include?(original_kind.to_s)
  end
  private_class_method :flow_kind

  def self.flow_totals(activity, from, to)
    income = BigDecimal("0")
    expenses = BigDecimal("0")
    activity.each do |transaction|
      next unless transaction.occurred_on >= from && transaction.occurred_on <= to
      case flow_kind(transaction)
      when :income then income += transaction.account_impact
      when :expense then expenses -= transaction.account_impact
      end
    end
    { income: decimal(income), expenses: decimal(expenses) }
  end
  private_class_method :flow_totals

  def self.category_breakdown(activity, from, to, kind)
    totals = Hash.new { |hash, key| hash[key] = BigDecimal("0") }
    activity.each do |transaction|
      next unless transaction.occurred_on >= from && transaction.occurred_on <= to
      next unless flow_kind(transaction) == kind
      category = transaction.category || transaction.reversal_of&.category
      next if category.nil?
      signed = transaction.account_impact
      totals[category] += kind == :expense ? -signed : signed
    end
    totals.map do |category, total|
      { category_id: category.id, name: category.name, kind: category.kind, is_default: category.is_default, visibility: category.visibility, total: decimal(total) }
    end.sort_by { |entry| -big(entry[:total]) }
  end
  private_class_method :category_breakdown

  def self.balance_at(accounts, impacts_by_account, bucket_end)
    assets = BigDecimal("0")
    liabilities = BigDecimal("0")
    accounts.each do |account|
      balance = account_balance(account, impacts_by_account, bucket_end)
      if account.asset?
        assets += balance
      else
        liabilities -= balance
      end
    end
    { assets: assets, liabilities: liabilities }
  end
  private_class_method :balance_at

  def self.account_balance(account, impacts_by_account, bucket_end)
    balance = bucket_end >= account.opening_balance_date ? account.opening_balance : BigDecimal("0")
    impacts_by_account[account.id].each do |occurred_on, amount|
      break if occurred_on > bucket_end
      balance += amount
    end
    balance
  end
  private_class_method :account_balance

  def self.liability_series(accounts, impacts_by_account, buckets)
    accounts.select(&:liability?).map do |account|
      {
        account_id: account.id,
        account_name: account.name,
        has_profile: account.debt_profile.present?,
        points: buckets.map { |_, bucket_end| { date: bucket_end.to_s, balance: decimal(-account_balance(account, impacts_by_account, bucket_end)) } }
      }
    end
  end
  private_class_method :liability_series

  def self.visible_accounts(household, user, scope)
    case scope
    when "shared" then household.accounts.where(visibility: :shared)
    when "private" then household.accounts.where(visibility: :private, private_owner_id: user.id)
    else household.accounts.where(visibility: :shared).or(household.accounts.where(visibility: :private, private_owner_id: user.id))
    end
  end
  private_class_method :visible_accounts

  def self.big(value)
    BigDecimal(value.to_s)
  end
  private_class_method :big

  def self.decimal(value)
    BigDecimal(value.to_s).to_s("F")
  end
  private_class_method :decimal
end
