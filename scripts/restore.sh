#!/bin/sh
# Restore a consistent backup pair (db + images) under ONE timestamp.
# DESTRUCTIVE: overwrites the live database and the product-photos volume.
# Run on the VPS from the project root (~/tanar-site).
#
#   ./scripts/restore.sh 20260604-033001
#
# The argument is the TS shared by backups/db-<TS>.sql.gz and
# backups/images-<TS>.tar.gz. Requires typing "yes" to proceed.

set -eu

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
VOL="tanar-site_product-images"

TS="${1:-}"
if [ -z "$TS" ]; then
  echo "usage: $0 <TS>   (e.g. 20260604-033001)" >&2
  echo "available pairs:" >&2
  ls -1 backups/db-*.sql.gz 2>/dev/null | sed 's#backups/db-##;s#.sql.gz##' >&2 || true
  exit 1
fi

DB_FILE="backups/db-$TS.sql.gz"
IMG_FILE="backups/images-$TS.tar.gz"
[ -f "$DB_FILE" ]  || { echo "missing $DB_FILE" >&2; exit 1; }
[ -f "$IMG_FILE" ] || { echo "missing $IMG_FILE" >&2; exit 1; }

POSTGRES_USER=$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)
POSTGRES_DB=$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)

echo "About to RESTORE from $TS — this OVERWRITES the live DB and photos:"
echo "  db:     $DB_FILE"
echo "  images: $IMG_FILE"
printf 'Type "yes" to proceed: '
read -r ans
[ "$ans" = "yes" ] || { echo "aborted"; exit 1; }

echo "restore [$TS]: database..."
# The dump from `pg_dump <db>` (plain SQL) restores into the existing db. Seed's
# TRUNCATE-style snapshot isn't used here — this is a raw dump replay.
gunzip -c "$DB_FILE" | $COMPOSE exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "restore [$TS]: photos into volume $VOL..."
docker volume inspect "$VOL" >/dev/null 2>&1 || docker volume create "$VOL" >/dev/null
docker run --rm -v "$VOL":/data -v "$PWD/backups":/backup:ro alpine \
  sh -c "cd /data && tar xzf /backup/images-$TS.tar.gz"

echo "restore [$TS]: restarting web..."
$COMPOSE restart web

echo "restore [$TS]: done. Verify the storefront shows products + photos."
