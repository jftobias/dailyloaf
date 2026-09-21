class CreateAccounts < ActiveRecord::Migration[8.1]
  def change
    create_table :accounts do |t|
      t.references :household, null: false, foreign_key: true
      t.references :private_owner, foreign_key: { to_table: :users }
      t.string :name, null: false
      t.string :account_type, null: false
      t.string :currency_code, null: false
      t.decimal :opening_balance, precision: 19, scale: 4, null: false, default: 0
      t.date :opening_balance_date, null: false
      t.string :visibility, null: false, default: "shared"
      t.datetime :archived_at
      t.timestamps
    end
    add_index :accounts, %i[household_id account_type]
    add_index :accounts, %i[household_id archived_at]
    add_index :accounts, %i[private_owner_id visibility]
    add_check_constraint :accounts, "account_type IN ('cash', 'checking', 'savings', 'credit_card', 'loan', 'investment', 'other_asset', 'other_liability')", name: "accounts_type_valid"
    add_check_constraint :accounts, "currency_code ~ '^[A-Z]{3}$'", name: "accounts_currency_code_iso4217"
    add_check_constraint :accounts, "visibility IN ('shared', 'private')", name: "accounts_visibility_valid"
    add_check_constraint :accounts, "(visibility = 'shared' AND private_owner_id IS NULL) OR (visibility = 'private' AND private_owner_id IS NOT NULL)", name: "accounts_owner_visibility_valid"
  end
end
