cors_origins = ENV.fetch("CORS_ORIGINS", "http://localhost:3000").split(",").map(&:strip).reject(&:empty?)

if cors_origins.empty? || cors_origins.any? { |origin| origin.include?("*") }
  raise "CORS_ORIGINS must contain one or more explicit, non-wildcard origins"
end

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*cors_origins)
    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      credentials: true
  end
end
