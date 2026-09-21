require "rails_helper"

RSpec.describe TransferService do
  let(:user) { User.create!(email_address: "transfer-owner@example.com", password: "password123") }
  let(:household) { Household.create!(name: "Home", currency_code: "COP") }
  let(:source) { household.accounts.create!(name: "Checking", account_type: :checking, currency_code: "COP", opening_balance: "100.0000", opening_balance_date: Date.current) }
  let(:destination) { household.accounts.create!(name: "Card", account_type: :credit_card, currency_code: "COP", opening_balance: "-100.0000", opening_balance_date: Date.current) }

  before { HouseholdMembership.create!(user: user, household: household, role: :owner) }

  it "creates equal and opposite transfer legs" do
    transfer = described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000")

    expect(transfer.financial_transactions.pluck(:account_impact)).to contain_exactly(-50, 50)
    expect(source.reload.posted_balance.to_s).to eq("50.0")
    expect(destination.reload.posted_balance.to_s).to eq("-50.0")
  end

  it "does not duplicate an idempotent transfer" do
    attrs = { household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000", idempotency_key: "transfer-1" }
    first = described_class.create!(**attrs)
    second = described_class.create!(**attrs)

    expect(second.id).to eq(first.id)
    expect(household.transfers.where(idempotency_key: "transfer-1").count).to eq(1)
  end

  it "rejects direct transfer-leg creation and private/shared transfers" do
    expect do
      FinancialTransactionService.create!(household: household, user: user, attributes: { account_id: source.id, kind: :transfer, account_impact: "1.0000", status: :posted, occurred_on: Date.current, description: "Direct leg" })
    end.to raise_error(ActiveRecord::RecordInvalid)

    private_account = household.accounts.create!(name: "Private", account_type: :checking, currency_code: "COP", visibility: :private, private_owner: user, opening_balance_date: Date.current)
    expect do
      described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: private_account.id, amount: "10.0000")
    end.to raise_error(ActiveRecord::RecordInvalid)
  end

  it "rejects a transfer idempotency key reused with different parameters" do
    described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000", idempotency_key: "transfer-conflict")

    expect do
      described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "51.0000", idempotency_key: "transfer-conflict")
    end.to raise_error(ActiveRecord::RecordInvalid, /Idempotency key/)
  end

  it "reverses both legs atomically" do
    transfer = described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000")
    reversal = described_class.reverse!(transfer: transfer, user: user)

    expect(reversal.reversal_of).to eq(transfer)
    expect(reversal.financial_transactions.pluck(:account_impact)).to contain_exactly(-50, 50)
    expect(source.reload.posted_balance.to_s).to eq("100.0")
    expect(destination.reload.posted_balance.to_s).to eq("-100.0")
  end

  it "rejects a second aggregate reversal" do
    transfer = described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000")
    described_class.reverse!(transfer: transfer, user: user)

    expect do
      described_class.reverse!(transfer: transfer, user: user)
    end.to raise_error(ActiveRecord::RecordInvalid, /only be reversed once/)
  end

  it "rolls back the reversal when a leg fails" do
    transfer = described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000")
    legs_created = 0
    allow_any_instance_of(ActiveRecord::Associations::CollectionProxy).to receive(:create!).and_wrap_original do |method, *args|
      if args.first.is_a?(Hash) && args.first[:kind].to_s == "transfer"
        legs_created += 1
        raise ActiveRecord::RecordInvalid.new(FinancialTransaction.new) if legs_created == 2
      end
      method.call(*args)
    end

    expect do
      described_class.reverse!(transfer: transfer, user: user)
    end.to raise_error(ActiveRecord::RecordInvalid)

    expect(transfer.reload.reversal).to be_nil
    expect(transfer.financial_transactions.reload.size).to eq(2)
    expect(source.reload.posted_balance.to_s).to eq("50.0")
    expect(destination.reload.posted_balance.to_s).to eq("-50.0")
  end

  it "rejects transaction-level mutation of transfer legs" do
    transfer = described_class.create!(household: household, user: user, source_account_id: source.id, destination_account_id: destination.id, amount: "50.0000")
    leg = transfer.financial_transactions.detect { |item| item.account_id == source.id }

    expect { FinancialTransactionService.update_pending!(transaction: leg, user: user, attributes: {}) }.to raise_error(TransferLegMutationError)
    expect { FinancialTransactionService.post!(leg) }.to raise_error(TransferLegMutationError)
    expect { FinancialTransactionService.reverse!(transaction: leg) }.to raise_error(TransferLegMutationError)
    expect { FinancialTransactionService.correct!(transaction: leg, user: user, attributes: {}) }.to raise_error(TransferLegMutationError)
    expect { FinancialTransactionService.destroy_pending!(transaction: leg) }.to raise_error(TransferLegMutationError)
    expect(leg.reload.persisted?).to be(true)
  end
end
