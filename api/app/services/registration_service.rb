class RegistrationService
  Result = Data.define(:user, :household, :membership, :session)

  def self.call(email_address:, password:, household_name:, currency_code: "COP", time_zone: "America/Bogota", request: nil)
    transaction do
      user = User.create!(email_address: email_address, password: password)
      household = Household.create!(name: household_name, currency_code: currency_code, time_zone: time_zone)
      membership = household.household_memberships.create!(user: user, role: :owner)
      session = Session.issue_for(user, request: request)

      Result.new(user, household, membership, session)
    end
  end

  def self.transaction(&)
    ApplicationRecord.transaction(&)
  end
end
