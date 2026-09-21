require "rails_helper"

RSpec.describe DebtProjectionService do
  let(:household) { Household.create!(name: "Home", currency_code: "COP", time_zone: "America/Bogota") }
  let(:profile) { DebtProfile.new(annual_interest_rate: rate, minimum_payment: minimum, planned_monthly_payment: planned) }
  let(:rate) { BigDecimal("0") }
  let(:minimum) { BigDecimal("100") }
  let(:planned) { nil }

  def project(balance:, **attrs)
    described_class.call(balance: BigDecimal(balance.to_s), profile: profile, time_zone: "America/Bogota")
  end

  it "amortizes a normal debt and totals reconcile" do
    profile.assign_attributes(annual_interest_rate: "12", minimum_payment: "100")
    result = project(balance: "1000")

    expect(result[:amortizing]).to be(true)
    expect(result[:months]).to eq(11)
    expect(result[:payoff_date]).to match(/\A\d{4}-\d{2}-\d{2}\z/)
    expect(BigDecimal(result[:total_paid])).to eq(BigDecimal(result[:current_balance]) + BigDecimal(result[:total_interest]))
    expect(BigDecimal(result[:total_interest])).to be_positive
  end

  it "supports zero-interest debts with linear amortization" do
    result = project(balance: "250")

    expect(result[:amortizing]).to be(true)
    expect(result[:months]).to eq(3)
    expect(result[:total_interest]).to eq("0.0")
    expect(result[:total_paid]).to eq("250.0")
  end

  it "prefers the planned payment over the minimum" do
    profile.assign_attributes(planned_monthly_payment: "125")
    result = project(balance: "250")

    expect(result[:assumed_monthly_payment]).to eq("125.0")
    expect(result[:months]).to eq(2)
  end

  it "flags a payment that cannot cover monthly interest" do
    profile.assign_attributes(annual_interest_rate: "24", minimum_payment: "5")
    result = project(balance: "1000")

    expect(result[:amortizing]).to be(false)
    expect(result[:months]).to be_nil
    expect(result[:payoff_date]).to be_nil
  end

  it "flags a zero payment on a positive balance" do
    profile.assign_attributes(minimum_payment: "0")
    result = project(balance: "100")

    expect(result[:amortizing]).to be(false)
  end

  it "treats a non-positive balance as already paid off" do
    result = project(balance: "-10")

    expect(result[:amortizing]).to be(true)
    expect(result[:months]).to eq(0)
  end

  it "never exceeds the documented horizon" do
    profile.assign_attributes(annual_interest_rate: "60", minimum_payment: "51")
    result = project(balance: "100000")

    expect(result[:months]).to be_nil.or be <= 600
    expect(result[:amortizing]).to be(false) if result[:months].nil?
  end

  it "uses the household time zone for the payoff date" do
    Time.use_zone("America/Bogota") do
      expected = (Time.zone.today >> 3).to_s
      result = project(balance: "250")
      expect(result[:payoff_date]).to eq(expected)
    end
  end
end
