#!/usr/bin/env bash
#
# The Latent Review — SQL dry run.
#
# Applies the full migration chain to a throwaway Postgres 16 container and
# runs the assertion files in tests/sql/. This is how a migration is verified
# before it goes anywhere near production: the chain must apply clean from
# nothing (every in-migration probe is a test in its own right), and the
# assertions must pass against the result.
#
#   npm run test:sql                    # whole chain + every *.test.sql
#   scripts/sql-dry-run.sh c2-letters   # just one assertion file
#
# Requires Docker. Nothing here touches a real database: the container is
# created fresh, used, and removed. No environment variables are read, no
# credentials exist to leak — the migrations carry no secrets by rule, and
# the salted hashes in the fixtures are literals that stand in for real
# digests (the salts never enter Postgres at all).
#
# Exit status is the point: non-zero if the chain fails to apply, if any
# assertion fails, or if Docker is unavailable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="lr-sql-dry-run-$$"
IMAGE="postgres:16"
FILTER="${1:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "sql-dry-run: docker is required but not installed." >&2
  exit 1
fi

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "sql-dry-run: starting $IMAGE …"
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=dry-run "$IMAGE" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null || {
  echo "sql-dry-run: postgres did not become ready." >&2
  exit 1
}

docker cp "$REPO_ROOT/supabase/migrations" "$CONTAINER:/tmp/migrations" >/dev/null
docker cp "$REPO_ROOT/tests/sql" "$CONTAINER:/tmp/sql" >/dev/null

echo "sql-dry-run: applying Supabase stubs …"
docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/sql/00-stubs.sql

echo "sql-dry-run: applying the migration chain …"
docker exec "$CONTAINER" bash -c '
  set -e
  for f in /tmp/migrations/*.sql; do
    echo "  - $(basename "$f")"
    psql -U postgres -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null
  done
'

echo "sql-dry-run: running assertions …"
status=0
for f in "$REPO_ROOT"/tests/sql/*.test.sql; do
  name="$(basename "$f")"
  if [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]]; then continue; fi
  echo "  --- $name"
  # Capture first, then filter: piping psql straight into grep would hand us
  # grep's exit code and a failing assertion would read as a pass.
  if ! output="$(docker exec "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f "/tmp/sql/$name" 2>&1)"; then
    status=1
  fi
  printf '%s\n' "$output" \
    | grep -E "pass:|FAIL|ERROR|passed ===" \
    | sed 's/^psql:[^ ]* //; s/^NOTICE:  //; s/^/      /' || true
done

if [ "$status" -ne 0 ]; then
  echo "sql-dry-run: FAILED" >&2
  exit 1
fi

echo "sql-dry-run: all assertions passed."
