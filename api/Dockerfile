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

FROM dependencies AS production

ENV RAILS_ENV=production \
    BUNDLE_WITHOUT=development:test \
    RAILS_LOG_TO_STDOUT=1

RUN groupadd --system --gid 1000 rails \
  && useradd --system --uid 1000 --gid 1000 --create-home rails
# API-only app: no asset pipeline, so no assets:precompile step is needed.
COPY --chown=rails:rails . .
# Runtime-writable dirs are absent from clean git checkouts (git never tracks
# empty dirs), and /rails itself stays root-owned after COPY, so create them
# explicitly with rails ownership before dropping privileges.
RUN mkdir -p tmp/pids tmp/cache tmp/sockets log storage \
  && chown -R rails:rails tmp log storage
USER rails
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl -fsS "http://localhost:${PORT:-3000}/up" || exit 1
CMD ["bin/rails", "server", "-b", "0.0.0.0"]
