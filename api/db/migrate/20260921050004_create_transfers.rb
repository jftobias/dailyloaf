class CreateTransfers < ActiveRecord::Migration[8.1]
  def change
    create_table :transfers do |t|
      t.references :household, null: false, foreign_key: true
      t.references :source_account, null: false, foreign_key: { to_table: :accounts }
      t.references :destination_account, null: false, foreign_key: { to_table: :accounts }
      t.references :reversal_of, foreign_key: { to_table: :transfers }, index: false
      t.decimal :amount, precision: 19, scale: 4, null: false
      t.string :currency_code, null: false
      t.string :status, null: false, default: "posted"
      t.string :idempotency_operation, null: false, default: "transfer_create"
      t.string :idempotency_key
      t.timestamps
    end
    add_index :transfers, %i[household_id idempotency_operation idempotency_key], unique: true, name: "transfers_idempotency", where: "idempotency_key IS NOT NULL"
    add_index :transfers, :reversal_of_id, unique: true, where: "reversal_of_id IS NOT NULL"
    add_index :transfers, %i[household_id created_at]
    add_check_constraint :transfers, "amount > 0", name: "transfers_amount_positive"
    add_check_constraint :transfers, "source_account_id <> destination_account_id", name: "transfers_accounts_distinct"
    add_check_constraint :transfers, "status IN ('pending', 'posted')", name: "transfers_status_valid"
  end
end
