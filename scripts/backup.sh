#!/bin/sh
# Consistent backup: Postgres dump + product-photos archive under ONE timestamp.
# Both must share the same TS so media_assets rows and image files stay in sync
# on restore. Run on the VPS from the project root (~/tanar-site).
#
#   ./scripts/backup.sh
#
# cron (nightly 03:30):
#   30 3 * * * cd /home/$USER/tanar-site && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Restore: see scripts/restore.sh (destructive — confirm first).

set -eu

cd "$(dirname "$0")/.."          # project root, regardless of caller cwd
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
VOL="tanar-site_product-images" # deterministic via COMPOSE_PROJECT_NAME=tanar-site
RETENTION_DAYS=14

mkdir -p backups                 # don't fail if missing (first run / fresh clone)

# Load POSTGRES_USER / POSTGRES_DB from .env without exporting the whole file.
POSTGRES_USER=$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)
POSTGRES_DB=$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)
if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "backup: POSTGRES_USER/POSTGRES_DB not found in .env — aborting" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
DB_FILE="backups/db-$TS.sql.gz"
IMG_FILE="backups/images-$TS.tar.gz"

echo "backup [$TS]: dumping database..."
# -T: no TTY (cron-safe). pg_dump | gzip in one consistent dump.
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_FILE"

echo "backup [$TS]: archiving photos from volume $VOL..."
# Guard: a missing volume would make `docker run -v` silently create an EMPTY
# one → empty (useless) backup. Abort instead.
docker volume inspect "$VOL" >/dev/null 2>&1 || {
  echo "backup: volume $VOL missing — aborting (db dump kept: $DB_FILE)" >&2
  exit 1
}
# Run tar as the host user so the resulting archive is owned by us (not root) —
# otherwise rotation's `find -delete` (run as the user) can't prune old files.
docker run --rm -u "$(id -u):$(id -g)" -v "$VOL":/data:ro -v "$PWD/backups":/backup alpine \
  tar czf "/backup/images-$TS.tar.gz" -C /data .

echo "backup [$TS]: done"
echo "  db:     $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"
echo "  images: $IMG_FILE ($(du -h "$IMG_FILE" | cut -f1))"

# Rotation: drop backups older than RETENTION_DAYS (both db- and images-).
echo "backup: pruning backups older than ${RETENTION_DAYS}d..."
find backups -maxdepth 1 -name 'db-*.sql.gz'    -mtime "+$RETENTION_DAYS" -print -delete
find backups -maxdepth 1 -name 'images-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete
