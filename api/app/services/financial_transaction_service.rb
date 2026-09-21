class FinancialTransactionService
  def self.create!(household:, user:, attributes:, idempotency_key: nil)
    raise ActiveRecord::RecordInvalid.new(FinancialTransaction.new), "Transfer legs must be created through TransferService" if attributes[:kind].to_s == "transfer"
    if idempotency_key.present?
      existing = existing_for(household, idempotency_key, "transaction_create")
      if existing
        raise ActiveRecord::RecordInvalid.new(existing), "Idempotency key was reused with different parameters" unless existing.idempotency_fingerprint == fingerprint(attributes)
        return existing
      end
    end

    ApplicationRecord.transaction do
      account = visible_account!(household, user, attributes.fetch(:account_id))
      raise ActiveRecord::RecordInvalid.new(account), "Archived accounts reject new transactions" if account.archived?
      category = category_for(household, user, attributes[:category_id], attributes[:kind])
      transaction = household.financial_transactions.create!(
        attributes.slice(:account_impact, :kind, :status, :occurred_on, :description, :notes, :replacement_for).merge(
          account: account,
          category: category,
          idempotency_key: idempotency_key,
          idempotency_operation: "transaction_create",
          idempotency_fingerprint: fingerprint(attributes)
        )
      )
      transaction
    end
  end

  def self.update_pending!(transaction:, user:, attributes:)
    ensure_not_transfer_leg!(transaction)
    ApplicationRecord.transaction do
      raise ActiveRecord::RecordInvalid.new(transaction), "Only pending transactions can be edited" unless transaction.pending?
      account = visible_account!(transaction.household, user, attributes[:account_id] || transaction.account_id)
      raise ActiveRecord::RecordInvalid.new(account), "Archived accounts reject new transactions" if account.archived?
      category = category_for(transaction.household, user, attributes[:category_id] || transaction.category_id, attributes[:kind] || transaction.kind)
      transaction.update!(attributes.slice(:account_impact, :kind, :occurred_on, :description, :notes).merge(account: account, category: category))
      transaction
    end
  end

  def self.post!(transaction)
    ensure_not_transfer_leg!(transaction)
    transaction.account.with_lock do
      raise ActiveRecord::RecordInvalid.new(transaction), "Only pending transactions can be posted" unless transaction.pending?
      transaction.update!(status: :posted)
    end
    transaction
  end

  def self.correct!(transaction:, user:, attributes:)
    ensure_not_transfer_leg!(transaction)
    ApplicationRecord.transaction do
      transaction.account.with_lock do
        raise ActiveRecord::RecordInvalid.new(transaction), "Only posted transactions can be corrected" unless transaction.posted?
        raise ActiveRecord::RecordInvalid.new(transaction), "A transaction can only be corrected once" if FinancialTransaction.exists?(reversal_of_id: transaction.id)

        reversal = transaction.household.financial_transactions.create!(
          household: transaction.household,
          account: transaction.account,
          kind: :balance_adjustment,
          account_impact: -transaction.account_impact,
          status: :posted,
          occurred_on: transaction.occurred_on,
          description: "Reversal of #{transaction.description}",
          reversal_of: transaction
        )
        replacement = create!(household: transaction.household, user: user, attributes: attributes.merge(account_id: transaction.account_id, replacement_for: transaction), idempotency_key: nil)
        [ reversal, replacement ]
      end
    end
  end

  def self.reverse!(transaction:)
    ensure_not_transfer_leg!(transaction)
    ApplicationRecord.transaction do
      transaction.account.with_lock do
        raise ActiveRecord::RecordInvalid.new(transaction), "Only posted transactions can be reversed" unless transaction.posted?
        raise ActiveRecord::RecordInvalid.new(transaction), "A transaction can only be reversed once" if FinancialTransaction.exists?(reversal_of_id: transaction.id)

        transaction.household.financial_transactions.create!(
          household: transaction.household,
          account: transaction.account,
          kind: :balance_adjustment,
          account_impact: -transaction.account_impact,
          status: :posted,
          occurred_on: Date.current,
          description: "Reversal of #{transaction.description}",
          reversal_of: transaction
        )
      end
    end
  end

  def self.destroy_pending!(transaction:)
    ensure_not_transfer_leg!(transaction)
    raise ActiveRecord::RecordInvalid.new(transaction), "Only pending transactions can be deleted" unless transaction.pending?
    transaction.destroy!
  end

  def self.ensure_not_transfer_leg!(transaction)
    raise TransferLegMutationError if transaction.transfer_id.present?
  end
  private_class_method :ensure_not_transfer_leg!

  def self.visible_account!(household, user, id)
    household.accounts.where(visibility: :shared).or(household.accounts.where(visibility: :private, private_owner_id: user.id)).find(id)
  end
  private_class_method :visible_account!

  def self.category_for(household, user, id, kind)
    return nil if id.blank?
    household.categories.where(kind: kind).active.available_to(user).find(id)
  end
  private_class_method :category_for

  def self.fingerprint(attributes)
    Digest::SHA256.hexdigest(attributes.to_h.sort_by { |key, _| key.to_s }.to_h.to_json)
  end
  private_class_method :fingerprint

  def self.existing_for(household, key, operation)
    household.financial_transactions.find_by(idempotency_key: key, idempotency_operation: operation)
  end
  private_class_method :existing_for
end
