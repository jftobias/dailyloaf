class Session < ApplicationRecord
  TOKEN_BYTES = 32
  LIFETIME = 30.days

  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true

  def self.issue_for(user, request: nil)
    raw_token = SecureRandom.urlsafe_base64(TOKEN_BYTES)
    session = create!(
      user: user,
      token_digest: digest(raw_token),
      ip_address: request&.remote_ip,
      user_agent: request&.user_agent,
      expires_at: LIFETIME.from_now
    )
    session.raw_token = raw_token
    session
  end

  def self.find_by_token(raw_token)
    return if raw_token.blank?

    where(token_digest: digest(raw_token)).find_by(revoked_at: nil).then do |session|
      session if session && (session.expires_at.nil? || session.expires_at.future?)
    end
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def active?
    revoked_at.nil? && (expires_at.nil? || expires_at.future?)
  end

  attr_reader :raw_token
  attr_writer :raw_token

  def self.digest(raw_token)
    Digest::SHA256.hexdigest(raw_token)
  end
end
