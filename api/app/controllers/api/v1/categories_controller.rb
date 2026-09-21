module Api
  module V1
    class CategoriesController < ApplicationController
      include FinancialScope

      def index
        categories = financial_household.categories.available_to(Current.user)
        render json: { categories: categories.map { |category| category_json(category) } }
      end

      def create
        category = CategoryService.create!(household: financial_household, user: Current.user, attributes: category_params)
        render json: { category: category_json(category) }, status: :created
      end

      def update
        category = financial_household.categories.available_to(Current.user).find(params[:id])
        category.update!(category_params.except(:kind, :visibility, :private_owner_id))
        render json: { category: category_json(category) }
      end

      def archive
        category = financial_household.categories.available_to(Current.user).find(params[:id])
        CategoryService.archive!(category)
        head :no_content
      end

      private

      def category_params
        params.permit(:name, :kind, :visibility)
      end

      def category_json(category)
        { id: category.id, name: category.name, kind: category.kind, visibility: category.visibility, private_owner_id: category.private_owner_id, is_default: category.is_default, archived_at: category.archived_at }
      end
    end
  end
end
