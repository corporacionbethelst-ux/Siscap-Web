#!/usr/bin/env bash
# ============================================================
# SISCAP Web — Restaurar base de datos desde un dump de pg_dump
# Uso: ./scripts/restore.sh <archivo.dump>
# ⚠️ Sobrescribe la base de datos destino. Detenga el backend antes.
# ============================================================
set -euo pipefail

DUMP="${1:?Uso: restore.sh <archivo.dump>}"
CONTAINER_DB="${DB_CONTAINER:-siscap_db_prod}"
[ -f "$DUMP" ] || { echo "[restore] ERROR: archivo no encontrado: $DUMP" >&2; exit 1; }

if [ -f "${DUMP%.dump}.sha256" ]; then
  sha256sum -c "${DUMP%.dump}.sha256" || { echo "[restore] ERROR: checksum no coincide" >&2; exit 1; }
fi

echo "[restore] Deteniendo backend ..."
docker stop "${BACKEND_CONTAINER:-siscap_backend_prod}" 2>/dev/null || true

echo "[restore] Restaurando $DUMP en $CONTAINER_DB ..."
docker exec -i "$CONTAINER_DB" pg_restore -U "${POSTGRES_USER:-siscap_user}" \
  -d "${POSTGRES_DB:-siscap_db}" --clean --if-exists --no-owner < "$DUMP"

echo "[restore] Reiniciando backend ..."
docker start "${BACKEND_CONTAINER:-siscap_backend_prod}" 2>/dev/null || true
echo "[restore] COMPLETADO"
