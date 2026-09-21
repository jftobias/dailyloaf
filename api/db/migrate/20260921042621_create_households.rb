class CreateHouseholds < ActiveRecord::Migration[8.1]
  def change
    create_table :households do |t|
      t.string :name, null: false
      t.string :currency_code, null: false, default: "COP"

      t.timestamps
    end
    add_check_constraint :households, "currency_code ~ '^[A-Z]{3}$'", name: "households_currency_code_iso4217"
  end
end
