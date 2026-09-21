# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_21_060001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "accounts", force: :cascade do |t|
    t.string "account_type", null: false
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.string "currency_code", null: false
    t.bigint "household_id", null: false
    t.string "name", null: false
    t.decimal "opening_balance", precision: 19, scale: 4, default: "0.0", null: false
    t.date "opening_balance_date", null: false
    t.bigint "private_owner_id"
    t.datetime "updated_at", null: false
    t.string "visibility", default: "shared", null: false
    t.index ["household_id", "account_type"], name: "index_accounts_on_household_id_and_account_type"
    t.index ["household_id", "archived_at"], name: "index_accounts_on_household_id_and_archived_at"
    t.index ["household_id", "id"], name: "accounts_household_identity", unique: true
    t.index ["household_id"], name: "index_accounts_on_household_id"
    t.index ["private_owner_id", "visibility"], name: "index_accounts_on_private_owner_id_and_visibility"
    t.index ["private_owner_id"], name: "index_accounts_on_private_owner_id"
    t.check_constraint "account_type::text = ANY (ARRAY['cash'::character varying, 'checking'::character varying, 'savings'::character varying, 'credit_card'::character varying, 'loan'::character varying, 'investment'::character varying, 'other_asset'::character varying, 'other_liability'::character varying]::text[])", name: "accounts_type_valid"
    t.check_constraint "currency_code::text ~ '^[A-Z]{3}$'::text", name: "accounts_currency_code_iso4217"
    t.check_constraint "visibility::text = 'shared'::text AND private_owner_id IS NULL OR visibility::text = 'private'::text AND private_owner_id IS NOT NULL", name: "accounts_owner_visibility_valid"
    t.check_constraint "visibility::text = ANY (ARRAY['shared'::character varying, 'private'::character varying]::text[])", name: "accounts_visibility_valid"
  end

  create_table "categories", force: :cascade do |t|
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.bigint "household_id", null: false
    t.boolean "is_default", default: false, null: false
    t.string "kind", null: false
    t.string "name", null: false
    t.bigint "private_owner_id"
    t.datetime "updated_at", null: false
    t.string "visibility", default: "shared", null: false
    t.index ["household_id", "archived_at"], name: "index_categories_on_household_id_and_archived_at"
    t.index ["household_id", "id"], name: "categories_household_identity", unique: true
    t.index ["household_id", "kind", "name", "private_owner_id"], name: "categories_private_identity", unique: true, where: "(private_owner_id IS NOT NULL)"
    t.index ["household_id", "kind", "name"], name: "categories_shared_identity", unique: true, where: "(private_owner_id IS NULL)"
    t.index ["household_id"], name: "index_categories_on_household_id"
    t.index ["private_owner_id"], name: "index_categories_on_private_owner_id"
    t.check_constraint "kind::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[])", name: "categories_kind_valid"
    t.check_constraint "visibility::text = 'shared'::text AND private_owner_id IS NULL OR visibility::text = 'private'::text AND private_owner_id IS NOT NULL", name: "categories_owner_visibility_valid"
    t.check_constraint "visibility::text = ANY (ARRAY['shared'::character varying, 'private'::character varying]::text[])", name: "categories_visibility_valid"
  end

  create_table "debt_profiles", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.decimal "annual_interest_rate", precision: 9, scale: 5, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.string "creditor_name"
    t.bigint "household_id", null: false
    t.date "maturity_on"
    t.decimal "minimum_payment", precision: 19, scale: 4, null: false
    t.text "notes"
    t.date "opened_on"
    t.decimal "original_principal", precision: 19, scale: 4
    t.integer "payment_due_day"
    t.decimal "planned_monthly_payment", precision: 19, scale: 4
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_debt_profiles_on_account_id", unique: true
    t.index ["household_id", "id"], name: "debt_profiles_household_identity", unique: true
    t.index ["household_id"], name: "index_debt_profiles_on_household_id"
    t.check_constraint "annual_interest_rate >= 0::numeric AND annual_interest_rate < 1000::numeric", name: "debt_profiles_rate_valid"
    t.check_constraint "minimum_payment >= 0::numeric", name: "debt_profiles_minimum_payment_valid"
    t.check_constraint "original_principal IS NULL OR original_principal > 0::numeric", name: "debt_profiles_principal_valid"
    t.check_constraint "payment_due_day IS NULL OR payment_due_day >= 1 AND payment_due_day <= 31", name: "debt_profiles_due_day_valid"
    t.check_constraint "planned_monthly_payment IS NULL OR planned_monthly_payment >= 0::numeric", name: "debt_profiles_planned_payment_valid"
  end

  create_table "docker_persistence_check", id: :integer, default: nil, force: :cascade do |t|
    t.text "note"
  end

  create_table "financial_transactions", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.decimal "account_impact", precision: 19, scale: 4, null: false
    t.bigint "category_id"
    t.datetime "created_at", null: false
    t.string "description", null: false
    t.bigint "household_id", null: false
    t.string "idempotency_fingerprint"
    t.string "idempotency_key"
    t.string "idempotency_operation", default: "transaction_create", null: false
    t.string "kind", null: false
    t.text "notes"
    t.date "occurred_on", null: false
    t.bigint "replacement_for_id"
    t.bigint "reversal_of_id"
    t.string "status", default: "posted", null: false
    t.bigint "transfer_id"
    t.datetime "updated_at", null: false
    t.index ["account_id", "status", "occurred_on"], name: "idx_on_account_id_status_occurred_on_d322f9cb55"
    t.index ["account_id"], name: "index_financial_transactions_on_account_id"
    t.index ["category_id", "occurred_on"], name: "index_financial_transactions_on_category_id_and_occurred_on"
    t.index ["category_id"], name: "index_financial_transactions_on_category_id"
    t.index ["household_id", "idempotency_operation", "idempotency_key"], name: "financial_transactions_idempotency", unique: true, where: "(idempotency_key IS NOT NULL)"
    t.index ["household_id", "occurred_on"], name: "index_financial_transactions_on_household_id_and_occurred_on"
    t.index ["household_id"], name: "index_financial_transactions_on_household_id"
    t.index ["replacement_for_id"], name: "index_financial_transactions_on_replacement_for_id", unique: true, where: "(replacement_for_id IS NOT NULL)"
    t.index ["reversal_of_id"], name: "index_financial_transactions_on_reversal_of_id", unique: true, where: "(reversal_of_id IS NOT NULL)"
    t.index ["transfer_id", "kind"], name: "index_financial_transactions_on_transfer_id_and_kind"
    t.index ["transfer_id"], name: "index_financial_transactions_on_transfer_id"
    t.check_constraint "(kind::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[])) AND category_id IS NOT NULL OR (kind::text = ANY (ARRAY['transfer'::character varying, 'balance_adjustment'::character varying]::text[])) AND category_id IS NULL", name: "financial_transactions_category_valid"
    t.check_constraint "kind::text = 'income'::text AND account_impact > 0::numeric OR kind::text = 'expense'::text AND account_impact < 0::numeric OR (kind::text = ANY (ARRAY['transfer'::character varying, 'balance_adjustment'::character varying]::text[]))", name: "financial_transactions_sign_valid"
    t.check_constraint "kind::text = ANY (ARRAY['income'::character varying, 'expense'::character varying, 'transfer'::character varying, 'balance_adjustment'::character varying]::text[])", name: "financial_transactions_kind_valid"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'posted'::character varying]::text[])", name: "financial_transactions_status_valid"
  end

  create_table "household_memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "household_id", null: false
    t.string "role", default: "member", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["household_id", "role"], name: "index_household_memberships_on_household_id_and_role"
    t.index ["household_id", "user_id"], name: "memberships_household_user_identity", unique: true
    t.index ["household_id"], name: "index_household_memberships_on_household_id"
    t.index ["user_id", "household_id"], name: "index_household_memberships_on_user_id_and_household_id", unique: true
    t.index ["user_id"], name: "index_household_memberships_on_user_id"
    t.check_constraint "role::text = ANY (ARRAY['owner'::character varying, 'member'::character varying]::text[])", name: "household_memberships_role_valid"
  end

  create_table "households", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "currency_code", default: "COP", null: false
    t.string "name", null: false
    t.string "time_zone", default: "America/Bogota", null: false
    t.datetime "updated_at", null: false
    t.check_constraint "currency_code::text ~ '^[A-Z]{3}$'::text", name: "households_currency_code_iso4217"
    t.check_constraint "time_zone::text <> ''::text", name: "households_time_zone_present"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "ip_address"
    t.datetime "revoked_at"
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.bigint "user_id", null: false
    t.index ["revoked_at"], name: "index_sessions_on_revoked_at"
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "transfers", force: :cascade do |t|
    t.decimal "amount", precision: 19, scale: 4, null: false
    t.datetime "created_at", null: false
    t.string "currency_code", null: false
    t.bigint "destination_account_id", null: false
    t.bigint "household_id", null: false
    t.string "idempotency_fingerprint"
    t.string "idempotency_key"
    t.string "idempotency_operation", default: "transfer_create", null: false
    t.bigint "reversal_of_id"
    t.bigint "source_account_id", null: false
    t.string "status", default: "posted", null: false
    t.datetime "updated_at", null: false
    t.index ["destination_account_id"], name: "index_transfers_on_destination_account_id"
    t.index ["household_id", "created_at"], name: "index_transfers_on_household_id_and_created_at"
    t.index ["household_id", "idempotency_operation", "idempotency_key"], name: "transfers_idempotency", unique: true, where: "(idempotency_key IS NOT NULL)"
    t.index ["household_id"], name: "index_transfers_on_household_id"
    t.index ["reversal_of_id"], name: "index_transfers_on_reversal_of_id", unique: true, where: "(reversal_of_id IS NOT NULL)"
    t.index ["source_account_id"], name: "index_transfers_on_source_account_id"
    t.check_constraint "amount > 0::numeric", name: "transfers_amount_positive"
    t.check_constraint "source_account_id <> destination_account_id", name: "transfers_accounts_distinct"
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'posted'::character varying]::text[])", name: "transfers_status_valid"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "accounts", "household_memberships", column: ["household_id", "private_owner_id"], primary_key: ["household_id", "user_id"]
  add_foreign_key "accounts", "households"
  add_foreign_key "accounts", "users", column: "private_owner_id"
  add_foreign_key "categories", "household_memberships", column: ["household_id", "private_owner_id"], primary_key: ["household_id", "user_id"]
  add_foreign_key "categories", "households"
  add_foreign_key "categories", "users", column: "private_owner_id"
  add_foreign_key "debt_profiles", "accounts"
  add_foreign_key "debt_profiles", "accounts", column: ["household_id", "account_id"], primary_key: ["household_id", "id"]
  add_foreign_key "debt_profiles", "households"
  add_foreign_key "financial_transactions", "accounts"
  add_foreign_key "financial_transactions", "accounts", column: ["household_id", "account_id"], primary_key: ["household_id", "id"]
  add_foreign_key "financial_transactions", "categories"
  add_foreign_key "financial_transactions", "categories", column: ["household_id", "category_id"], primary_key: ["household_id", "id"]
  add_foreign_key "financial_transactions", "financial_transactions", column: "replacement_for_id"
  add_foreign_key "financial_transactions", "financial_transactions", column: "reversal_of_id"
  add_foreign_key "financial_transactions", "households"
  add_foreign_key "financial_transactions", "transfers"
  add_foreign_key "household_memberships", "households"
  add_foreign_key "household_memberships", "users"
  add_foreign_key "sessions", "users"
  add_foreign_key "transfers", "accounts", column: "destination_account_id"
  add_foreign_key "transfers", "accounts", column: "source_account_id"
  add_foreign_key "transfers", "households"
  add_foreign_key "transfers", "transfers", column: "reversal_of_id"
end
