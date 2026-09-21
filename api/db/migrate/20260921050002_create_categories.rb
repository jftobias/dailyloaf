class CreateCategories < ActiveRecord::Migration[8.1]
  def change
    create_table :categories do |t|
      t.references :household, null: false, foreign_key: true
      t.references :private_owner, foreign_key: { to_table: :users }
      t.string :name, null: false
      t.string :kind, null: false
      t.string :visibility, null: false, default: "shared"
      t.boolean :is_default, null: false, default: false
      t.datetime :archived_at
      t.timestamps
    end
    add_index :categories, %i[household_id kind name private_owner_id], unique: true, name: "categories_identity"
    add_index :categories, %i[household_id archived_at]
    add_check_constraint :categories, "kind IN ('income', 'expense')", name: "categories_kind_valid"
    add_check_constraint :categories, "visibility IN ('shared', 'private')", name: "categories_visibility_valid"
    add_check_constraint :categories, "(visibility = 'shared' AND private_owner_id IS NULL) OR (visibility = 'private' AND private_owner_id IS NOT NULL)", name: "categories_owner_visibility_valid"
  end
end
