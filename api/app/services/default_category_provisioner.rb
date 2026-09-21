class DefaultCategoryProvisioner
  DEFAULTS = {
    "income" => [ "Salary", "Freelance & business", "Interest & dividends", "Gifts & support", "Other income" ],
    "expense" => [ "Housing", "Utilities", "Groceries", "Dining out", "Transportation", "Health", "Insurance", "Education", "Personal care", "Pets", "Entertainment", "Travel", "Giving", "Family support", "Taxes", "Fees", "Other expense" ]
  }.freeze

  def self.call(household)
    DEFAULTS.each do |kind, names|
      names.each do |name|
        household.categories.find_or_create_by!(name: name, kind: kind, private_owner_id: nil) do |category|
          category.visibility = :shared
          category.is_default = true
        end
      end
    end
  end
end
