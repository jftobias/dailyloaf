class CreateDebtProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :debt_profiles do |t|
      t.references :household, null: false, foreign_key: true
      t.references :account, null: false, foreign_key: true, index: { unique: true }
      t.string :creditor_name
      t.decimal :annual_interest_rate, precision: 9, scale: 5, null: false, default: 0
      t.decimal :minimum_payment, precision: 19, scale: 4, null: false
      t.decimal :planned_monthly_payment, precision: 19, scale: 4
      t.integer :payment_due_day
      t.decimal :original_principal, precision: 19, scale: 4
      t.date :opened_on
      t.date :maturity_on
      t.text :notes
      t.timestamps

      t.index %i[household_id id], unique: true, name: "debt_profiles_household_identity"
      t.check_constraint "annual_interest_rate >= 0 AND annual_interest_rate < 1000", name: "debt_profiles_rate_valid"
      t.check_constraint "minimum_payment >= 0", name: "debt_profiles_minimum_payment_valid"
      t.check_constraint "planned_monthly_payment IS NULL OR planned_monthly_payment >= 0", name: "debt_profiles_planned_payment_valid"
      t.check_constraint "payment_due_day IS NULL OR payment_due_day BETWEEN 1 AND 31", name: "debt_profiles_due_day_valid"
      t.check_constraint "original_principal IS NULL OR original_principal > 0", name: "debt_profiles_principal_valid"
    end

    add_foreign_key :debt_profiles, :accounts, column: %i[household_id account_id], primary_key: %i[household_id id]
  end
end
