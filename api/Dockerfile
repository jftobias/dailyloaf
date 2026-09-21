# syntax=docker/dockerfile:1

ARG RUBY_VERSION=3.3.10
FROM ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y curl libpq5 \
  && rm -rf /var/lib/apt/lists/*

ENV BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3

FROM base AS dependencies

RUN apt-get update -qq \
  && apt-get install --no-install-recommends -y build-essential libpq-dev pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
RUN bundle install \
  && rm -rf /root/.bundle /usr/local/bundle/cache

FROM dependencies AS development

ENV RAILS_ENV=development
COPY . .
EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]

FROM dependencies AS build

ENV RAILS_ENV=production
COPY . .
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

FROM base AS production

ENV RAILS_ENV=production \
    BUNDLE_WITHOUT=development:test

RUN groupadd --system --gid 1000 rails \
  && useradd --system --uid 1000 --gid 1000 --create-home rails
COPY --from=dependencies /usr/local/bundle /usr/local/bundle
COPY --from=build --chown=rails:rails /rails /rails
USER rails
EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]
