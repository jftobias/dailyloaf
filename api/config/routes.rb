Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      namespace :auth do
        post "register", to: "registrations#create"
        post "session", to: "sessions#create"
        delete "session", to: "sessions#destroy"
        get "me", to: "sessions#me"
        get "csrf", to: "sessions#csrf"
      end

      resources :households, only: %i[index show update] do
        resources :memberships, only: %i[index update destroy], controller: "household_memberships"
        resources :accounts, only: %i[index show create update], controller: "accounts" do
          post :archive, on: :member
        end
        resources :categories, only: %i[index create update], controller: "categories" do
          post :archive, on: :member
        end
        resources :transactions, only: %i[index show create update destroy], controller: "financial_transactions" do
          post :post, on: :member
          post :reverse, on: :member
        end
        resources :transfers, only: %i[index show create update], controller: "transfers" do
          post :reverse, on: :member
        end
        get "overview", to: "overview#show"
      end
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
