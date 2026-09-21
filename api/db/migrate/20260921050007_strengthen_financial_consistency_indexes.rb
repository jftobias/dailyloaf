class StrengthenFinancialConsistencyIndexes < ActiveRecord::Migration[8.1]
  def change
    remove_index :categories, name: "categories_identity"
    add_index :categories, %i[household_id kind name], unique: true, name: "categories_shared_identity", where: "private_owner_id IS NULL"
    add_index :categories, %i[household_id kind name private_owner_id], unique: true, name: "categories_private_identity", where: "private_owner_id IS NOT NULL"

    add_index :accounts, %i[household_id id], unique: true, name: "accounts_household_identity"
    add_index :categories, %i[household_id id], unique: true, name: "categories_household_identity"
    add_index :household_memberships, %i[household_id user_id], unique: true, name: "memberships_household_user_identity"

    add_foreign_key :accounts, :household_memberships, column: %i[household_id private_owner_id], primary_key: %i[household_id user_id]
    add_foreign_key :categories, :household_memberships, column: %i[household_id private_owner_id], primary_key: %i[household_id user_id]
    add_foreign_key :financial_transactions, :accounts, column: %i[household_id account_id], primary_key: %i[household_id id]
    add_foreign_key :financial_transactions, :categories, column: %i[household_id category_id], primary_key: %i[household_id id]
  end
end
