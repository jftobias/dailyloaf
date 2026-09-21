class ProvisionDefaultCategories < ActiveRecord::Migration[8.1]
  DEFAULTS = {
    "income" => [ "Salary", "Freelance & business", "Interest & dividends", "Gifts & support", "Other income" ],
    "expense" => [ "Housing", "Utilities", "Groceries", "Dining out", "Transportation", "Health", "Insurance", "Education", "Personal care", "Pets", "Entertainment", "Travel", "Giving", "Family support", "Taxes", "Fees", "Other expense" ]
  }.freeze

  def up
    execute("SELECT id FROM households").each do |household|
      DEFAULTS.each do |kind, names|
        names.each do |name|
          quoted_name = connection.quote(name)
          quoted_kind = connection.quote(kind)
          execute <<~SQL
            INSERT INTO categories (household_id, name, kind, visibility, is_default, created_at, updated_at)
            SELECT #{household["id"]}, #{quoted_name}, #{quoted_kind}, 'shared', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (
              SELECT 1 FROM categories
              WHERE household_id = #{household["id"]} AND name = #{quoted_name}
                AND kind = #{quoted_kind} AND private_owner_id IS NULL
            )
          SQL
        end
      end
    end
  end

  def down
    execute("DELETE FROM categories WHERE is_default = TRUE")
  end
end
