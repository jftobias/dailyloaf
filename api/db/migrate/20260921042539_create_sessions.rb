class CreateSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.string :ip_address
      t.string :user_agent
      t.datetime :expires_at, null: false
      t.datetime :revoked_at

      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true
    add_index :sessions, :revoked_at
  end
end
