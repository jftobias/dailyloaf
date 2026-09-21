class AddIdempotencyFingerprints < ActiveRecord::Migration[8.1]
  def change
    add_column :financial_transactions, :idempotency_fingerprint, :string
    add_column :transfers, :idempotency_fingerprint, :string
  end
end
