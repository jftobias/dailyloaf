class TransferService
  def self.create!(household:, user:, source_account_id:, destination_account_id:, amount:, status: :posted, idempotency_key: nil)
    if idempotency_key.present?
      existing = household.transfers.find_by(idempotency_key: idempotency_key, idempotency_operation: "transfer_create")
      if existing
        raise ActiveRecord::RecordInvalid.new(existing), "Idempotency key was reused with different parameters" unless existing.idempotency_fingerprint == fingerprint(source_account_id: source_account_id, destination_account_id: destination_account_id, amount: amount, status: status)
        return existing
      end
    end

    ApplicationRecord.transaction do
      source, destination = lock_accounts(household, user, source_account_id, destination_account_id)
      transfer = household.transfers.create!(
        source_account: source,
        destination_account: destination,
        amount: amount,
        currency_code: household.currency_code,
        status: status,
        idempotency_key: idempotency_key,
        idempotency_operation: "transfer_create",
        idempotency_fingerprint: fingerprint(source_account_id: source_account_id, destination_account_id: destination_account_id, amount: amount, status: status)
      )
      create_legs!(transfer, source: source, destination: destination, status: status)
      transfer
    end
  end

  def self.update_pending!(transfer:, user:, attributes:)
    ApplicationRecord.transaction do
      source, destination = lock_accounts(transfer.household, user, attributes.fetch(:source_account_id, transfer.source_account_id), attributes.fetch(:destination_account_id, transfer.destination_account_id))
      raise ActiveRecord::RecordInvalid.new(transfer), "Only pending transfers can be edited" unless transfer.pending?
      transfer.update!(source_account: source, destination_account: destination, amount: attributes.fetch(:amount), currency_code: transfer.household.currency_code)
      transfer.financial_transactions.destroy_all
      create_legs!(transfer, source: source, destination: destination, status: :pending)
      transfer
    end
  end

  def self.reverse!(transfer:, user:)
    ApplicationRecord.transaction do
      source, destination = lock_accounts(transfer.household, user, transfer.source_account_id, transfer.destination_account_id)
      raise ActiveRecord::RecordInvalid.new(transfer), "Only posted transfers can be reversed" unless transfer.posted?
      raise ActiveRecord::RecordInvalid.new(transfer), "A transfer can only be reversed once" if transfer.reversal.present?

      reversal = transfer.household.transfers.create!(
        source_account: destination,
        destination_account: source,
        amount: transfer.amount,
        currency_code: transfer.currency_code,
        status: :posted,
        reversal_of: transfer,
        idempotency_operation: "transfer_reversal"
      )
      create_legs!(reversal, source: destination, destination: source, status: :posted)
      reversal
    end
  end

  def self.fingerprint(attributes)
    Digest::SHA256.hexdigest(attributes.to_h.sort_by { |key, _| key.to_s }.to_h.to_json)
  end
  private_class_method :fingerprint

  def self.lock_accounts(household, user, source_id, destination_id)
    ids = [ source_id.to_i, destination_id.to_i ].sort
    accounts = household.accounts.where(id: ids).where(visibility: :shared).or(household.accounts.where(id: ids, visibility: :private, private_owner_id: user.id)).lock.order(:id).to_a
    raise ActiveRecord::RecordNotFound unless accounts.size == 2
    source = accounts.find { |account| account.id == source_id.to_i }
    destination = accounts.find { |account| account.id == destination_id.to_i }
    raise ActiveRecord::RecordInvalid.new(source || destination), "Accounts must be distinct and active" if source.nil? || destination.nil? || source.id == destination.id || source.archived? || destination.archived?
    raise ActiveRecord::RecordInvalid.new(source), "Accounts must share the household currency" unless source.currency_code == household.currency_code && destination.currency_code == household.currency_code
    raise ActiveRecord::RecordInvalid.new(source), "Transfer visibility is not allowed" if source.visibility != destination.visibility || (source.visibility_private? && source.private_owner_id != destination.private_owner_id)
    [ source, destination ]
  end
  private_class_method :lock_accounts

  def self.create_legs!(transfer, source:, destination:, status:)
    transfer.financial_transactions.create!(household: transfer.household, account: source, kind: :transfer, account_impact: -transfer.amount, status: status, occurred_on: Date.current, description: "Transfer to #{destination.name}")
    transfer.financial_transactions.create!(household: transfer.household, account: destination, kind: :transfer, account_impact: transfer.amount, status: status, occurred_on: Date.current, description: "Transfer from #{source.name}")
  end
  private_class_method :create_legs!
end
