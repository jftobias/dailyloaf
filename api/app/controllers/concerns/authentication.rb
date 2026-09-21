module Authentication
  extend ActiveSupport::Concern

  SESSION_COOKIE = :dailyloaf_session

  included do
    before_action :require_authentication
  end

  class_methods do
    def allow_unauthenticated_access(**options)
      skip_before_action :require_authentication, **options
    end
  end

  private

  def require_authentication
    resume_session || render_error("unauthorized", "Authentication is required.", status: :unauthorized)
  end

  def resume_session
    return Current.session if Current.session

    Current.session = Session.find_by_token(cookies.signed[SESSION_COOKIE])
  end

  def start_new_session_for(user)
    terminate_session
    session = Session.issue_for(user, request: request)
    Current.session = session
    cookies.signed[SESSION_COOKIE] = session_cookie_options(session).merge(value: session.raw_token)
    session
  end

  def terminate_session
    Current.session&.revoke!
    Current.session = nil
    cookies.delete(SESSION_COOKIE, **session_cookie_options.except(:value))
  end

  def session_cookie_options(session = nil)
    {
      httponly: true,
      same_site: :lax,
      secure: Rails.env.production?,
      expires: session&.expires_at || Session::LIFETIME.from_now
    }
  end
end
