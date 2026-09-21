module FinancialScope
  extend ActiveSupport::Concern

  private

  def financial_household
    @financial_household ||= Current.user.household_memberships.find_by!(household_id: params[:household_id]).household
  end

  def visible_accounts(scope: :combined)
    case scope.to_s
    when "shared" then financial_household.accounts.where(visibility: :shared)
    when "private" then financial_household.accounts.where(visibility: :private, private_owner_id: Current.user.id)
    else financial_household.accounts.where(visibility: :shared).or(financial_household.accounts.where(visibility: :private, private_owner_id: Current.user.id))
    end
  end

  def visible_account(id)
    visible_accounts.find(id)
  end

  def financial_decimal(value)
    BigDecimal(value.to_s).to_s("F")
  end
end
