#!/usr/bin/env bash
# Regression check for the production API image. Proves:
#   - the image runs as the non-root rails user
#   - /rails/tmp (+ pids/cache/sockets), /rails/log, /rails/storage are writable
#   - bin/rails db:prepare succeeds against fresh primary and cache databases
#   - Puma boots and GET /up returns 200
#
# Requires: docker, and either RAILS_MASTER_KEY in the environment or
# api/config/credentials/production.key on this machine. The key is never printed.
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="dailyloaf-api-production-verify"
NETWORK="dailyloaf-verify-$$"
PG_CONTAINER="dailyloaf-verify-pg-$$"
API_CONTAINER="dailyloaf-verify-api-$$"
API_PORT=3456

if [[ -z "${RAILS_MASTER_KEY:-}" ]]; then
  KEY_FILE="$API_DIR/config/credentials/production.key"
  [[ -f "$KEY_FILE" ]] || {
    echo "error: set RAILS_MASTER_KEY or create $KEY_FILE" >&2
    exit 1
  }
  RAILS_MASTER_KEY="$(cat "$KEY_FILE")"
fi

cleanup() {
  docker rm -f "$API_CONTAINER" "$PG_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Building production image"
docker build -f "$API_DIR/Dockerfile" --target production -t "$IMAGE" "$API_DIR"

echo "==> Checking runtime user"
user="$(docker run --rm "$IMAGE" id -un)"
if [[ "$user" != "rails" ]]; then
  echo "error: container runs as '$user', expected 'rails'" >&2
  exit 1
fi

echo "==> Checking runtime-writable directories as the rails user"
docker run --rm "$IMAGE" sh -c '
  set -e
  for d in tmp tmp/pids tmp/cache tmp/sockets log storage; do
    [ -d "/rails/$d" ] && [ -w "/rails/$d" ] || { echo "not writable: /rails/$d" >&2; exit 1; }
  done
'

echo "==> Starting ephemeral PostgreSQL"
docker network create "$NETWORK" >/dev/null
docker run -d --name "$PG_CONTAINER" --network "$NETWORK" \
  -e POSTGRES_USER=dailyloaf -e POSTGRES_PASSWORD=dailyloaf -e POSTGRES_DB=postgres \
  postgres:18-alpine >/dev/null

for _ in $(seq 1 30); do
  if docker run --rm --network "$NETWORK" postgres:18-alpine pg_isready -h "$PG_CONTAINER" -U dailyloaf >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

DB_BASE="postgresql://dailyloaf:dailyloaf@$PG_CONTAINER:5432"
COMMON_ENV=(
  -e "RAILS_ENV=production"
  -e "RAILS_MASTER_KEY=$RAILS_MASTER_KEY"
  -e "DATABASE_URL=$DB_BASE/verify_primary"
  -e "CACHE_DATABASE_URL=$DB_BASE/verify_cache"
  -e "CORS_ORIGINS=https://dailyloaf.online"
)

echo "==> Running db:prepare against fresh primary and cache databases"
docker run --rm --network "$NETWORK" "${COMMON_ENV[@]}" "$IMAGE" bin/rails db:prepare

echo "==> Booting Puma (PORT=$API_PORT)"
docker run -d --name "$API_CONTAINER" --network "$NETWORK" \
  "${COMMON_ENV[@]}" -e "PORT=$API_PORT" "$IMAGE" >/dev/null

echo "==> Waiting for GET /up to return 200"
healthy=""
for _ in $(seq 1 45); do
  if docker run --rm --network "$NETWORK" "$IMAGE" \
      curl -fsS "http://$API_CONTAINER:$API_PORT/up" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  if [[ "$(docker inspect -f '{{.State.Status}}' "$API_CONTAINER" 2>/dev/null)" != "running" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$healthy" ]]; then
  echo "error: GET /up did not return 200; container logs follow" >&2
  docker logs "$API_CONTAINER" >&2 || true
  exit 1
fi

echo "production image verification passed"
