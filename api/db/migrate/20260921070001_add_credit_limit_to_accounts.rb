class AddCreditLimitToAccounts < ActiveRecord::Migration[8.1]
  def change
    add_column :accounts, :credit_limit, :decimal, precision: 19, scale: 4
    add_check_constraint :accounts,
      "credit_limit IS NULL OR credit_limit > 0",
      name: "accounts_credit_limit_positive"
    add_check_constraint :accounts,
      "credit_limit IS NULL OR account_type = 'credit_card'",
      name: "accounts_credit_limit_card_only"
  end
end
