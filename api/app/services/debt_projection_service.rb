# Declining-balance monthly payoff estimate (MVP convention).
#
# monthly interest = balance * (annual_interest_rate / 100 / 12), rounded
# half-even to 4 decimals per month. Payments are assumed monthly and
# constant. Maximum horizon: 600 months (50 years). Results are estimates —
# they do not account for variable rates, fees, or changing payments.
class DebtProjectionService
  MAX_MONTHS = 600
  MONEY_SCALE = 4

  # balance: positive amount owed (-posted_balance of the liability account).
  def self.call(balance:, profile:, time_zone:)
    balance = BigDecimal(balance.to_s)
    payment = profile.planned_monthly_payment.presence || profile.minimum_payment
    monthly_rate = profile.annual_interest_rate / 100 / 12

    today = Time.find_zone!(time_zone).today
    result = {
      current_balance: decimal(balance),
      assumed_monthly_payment: decimal(payment),
      annual_interest_rate: decimal(profile.annual_interest_rate),
      months: nil,
      payoff_date: nil,
      total_interest: nil,
      total_paid: nil,
      amortizing: false,
      horizon_months: MAX_MONTHS
    }

    return result.merge(amortizing: true, months: 0, payoff_date: today.to_s, total_interest: "0.0", total_paid: decimal(balance)) if balance <= 0
    return result if payment <= 0

    months = 0
    total_interest = BigDecimal("0")
    remaining = balance

    while remaining.positive? && months < MAX_MONTHS
      interest = (remaining * monthly_rate).round(MONEY_SCALE, :half_even)
      return result.merge(total_interest: decimal(total_interest)) if interest >= payment

      remaining = remaining + interest - payment
      total_interest += interest
      months += 1
    end

    return result.merge(total_interest: decimal(total_interest)) unless months < MAX_MONTHS

    result.merge(
      amortizing: true,
      months: months,
      payoff_date: (today >> months).to_s,
      total_interest: decimal(total_interest),
      total_paid: decimal(balance + total_interest)
    )
  end

  def self.decimal(value)
    BigDecimal(value.to_s).to_s("F")
  end
  private_class_method :decimal
end
