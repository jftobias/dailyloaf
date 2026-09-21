class AddTimeZoneToHouseholds < ActiveRecord::Migration[8.1]
  def change
    add_column :households, :time_zone, :string, null: false, default: "America/Bogota"
    add_check_constraint :households, "time_zone <> ''", name: "households_time_zone_present"
  end
end
