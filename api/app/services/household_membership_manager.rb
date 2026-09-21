class HouseholdMembershipManager
  def self.update_role!(membership, role)
    Household.transaction do
      household = Household.lock.find(membership.household_id)
      membership = household.household_memberships.lock.find(membership.id)
      if membership.owner? && role.to_s != "owner" && household.household_memberships.where(role: :owner).count <= 1
        raise ActiveRecord::RecordInvalid.new(membership), "A household must retain an owner"
      end

      membership.update!(role: role)
    end
  end

  def self.remove!(membership)
    Household.transaction do
      household = Household.lock.find(membership.household_id)
      membership = household.household_memberships.lock.find(membership.id)
      owner_count = household.household_memberships.where(role: :owner).count
      if membership.owner? && owner_count <= 1
        raise ActiveRecord::RecordInvalid.new(membership), "A household must retain an owner"
      end

      membership.destroy!
    end
  end
end
