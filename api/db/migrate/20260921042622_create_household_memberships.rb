class CreateHouseholdMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :household_memberships do |t|
      t.references :user, null: false, foreign_key: true
      t.references :household, null: false, foreign_key: true
      t.string :role, null: false, default: "member"

      t.timestamps
    end
    add_index :household_memberships, %i[user_id household_id], unique: true
    add_index :household_memberships, %i[household_id role]
    add_check_constraint :household_memberships, "role IN ('owner', 'member')", name: "household_memberships_role_valid"
  end
end
