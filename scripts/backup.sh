#!/usr/bin/env bash
# ============================================================
# SISCAP Web — Backup de PostgreSQL + uploads
# Uso: ./scripts/backup.sh [directorio_destino]
# Lee credenciales del contenedor siscap_db (compose producción).
# ============================================================
set -euo pipefail

DEST="${1:-./backups}"
CONTAINER_DB="${DB_CONTAINER:-siscap_db_prod}"
CONTAINER_API="${BACKEND_CONTAINER:-siscap_backend_prod}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$DEST"

echo "[backup] Dumping base de datos desde $CONTAINER_DB ..."
docker exec "$CONTAINER_DB" pg_dump -U "${POSTGRES_USER:-siscap_user}" -d "${POSTGRES_DB:-siscap_db}" \
  --format=custom --compress=gzip > "$DEST/siscap_db_$TIMESTAMP.dump"

echo "[backup] Empacando archivos de uploads desde $CONTAINER_API ..."
docker run --rm --volumes-from "$CONTAINER_API" alpine tar czf - -C /app uploads \
  > "$DEST/siscap_uploads_$TIMESTAMP.tar.gz" 2>/dev/null || \
  echo "[backup] AVISO: no se pudo respaldar uploads (¿existe el volumen?)"

echo "[backup] Calculando checksums ..."
sha256sum "$DEST"/siscap_*_"$TIMESTAMP".* > "$DEST/checksums_$TIMESTAMP.sha256"

echo "[backup] Eliminando backups antiguos (> $RETENTION_DAYS días) ..."
find "$DEST" -name 'siscap_*' -mtime +"$RETENTION_DAYS" -delete || true

echo "[backup] COMPLETADO -> $DEST/siscap_db_$TIMESTAMP.dump"
