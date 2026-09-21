class CategoryService
  def self.create!(household:, user:, attributes:)
    category = household.categories.new(attributes)
    category.private_owner = user if category.visibility_private?
    category.save!
    category
  end

  def self.archive!(category)
    category.update!(archived_at: Time.current)
  end
end
