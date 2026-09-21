class CreateFinancialTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :financial_transactions do |t|
      t.references :household, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true
      t.references :category, foreign_key: true
      t.references :transfer, foreign_key: true
      t.references :reversal_of, foreign_key: { to_table: :financial_transactions }, index: false
      t.references :replacement_for, foreign_key: { to_table: :financial_transactions }, index: false
      t.string :kind, null: false
      t.decimal :account_impact, precision: 19, scale: 4, null: false
      t.string :status, null: false, default: "posted"
      t.date :occurred_on, null: false
      t.string :description, null: false
      t.text :notes
      t.string :idempotency_operation, null: false, default: "transaction_create"
      t.string :idempotency_key
      t.timestamps
    end
    add_index :financial_transactions, %i[account_id status occurred_on]
    add_index :financial_transactions, %i[household_id occurred_on]
    add_index :financial_transactions, %i[category_id occurred_on]
    add_index :financial_transactions, %i[transfer_id kind]
    add_index :financial_transactions, :reversal_of_id, unique: true, where: "reversal_of_id IS NOT NULL"
    add_index :financial_transactions, :replacement_for_id, unique: true, where: "replacement_for_id IS NOT NULL"
    add_index :financial_transactions, %i[household_id idempotency_operation idempotency_key], unique: true, name: "financial_transactions_idempotency", where: "idempotency_key IS NOT NULL"
    add_check_constraint :financial_transactions, "kind IN ('income', 'expense', 'transfer', 'balance_adjustment')", name: "financial_transactions_kind_valid"
    add_check_constraint :financial_transactions, "status IN ('pending', 'posted')", name: "financial_transactions_status_valid"
    add_check_constraint :financial_transactions, "(kind = 'income' AND account_impact > 0) OR (kind = 'expense' AND account_impact < 0) OR (kind IN ('transfer', 'balance_adjustment'))", name: "financial_transactions_sign_valid"
    add_check_constraint :financial_transactions, "(kind IN ('income', 'expense') AND category_id IS NOT NULL) OR (kind IN ('transfer', 'balance_adjustment') AND category_id IS NULL)", name: "financial_transactions_category_valid"
  end
end
