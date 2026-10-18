#!/usr/bin/env bash
# ============================================================
# SISCAP Web — Verificación de salud (útil para cron/monitoreo)
# Chequea: DB viva, /health del backend y respuesta del frontend.
# Exit 0 = sano; distinto de 0 = fallo.
# ============================================================
set -uo pipefail

BASE_URL="${SISCAP_BASE_URL:-https://localhost}"
API_URL="${SISCAP_API_URL:-http://localhost:8000}"
FAIL=0

echo "[health] Base de datos..."
if docker exec "${DB_CONTAINER:-siscap_db_prod}" pg_isready -U "${POSTGRES_USER:-siscap_user}" >/dev/null 2>&1; then
  echo "  ✅ db: OK"
else
  echo "  ❌ db: SIN RESPUESTA"; FAIL=1
fi

echo "[health] Backend /health..."
CODE=$(curl -sk -o /tmp/hc.json -w '%{http_code}' --max-time 10 "$API_URL/health" || echo 000)
if [ "$CODE" = "200" ]; then
  echo "  ✅ backend: OK ($(cat /tmp/hc.json))"
else
  echo "  ❌ backend: HTTP $CODE"; FAIL=1
fi

echo "[health] Frontend..."
FCODE=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$BASE_URL/" || echo 000)
if [ "$FCODE" = "200" ]; then
  echo "  ✅ frontend: OK"
else
  echo "  ❌ frontend: HTTP $FCODE"; FAIL=1
fi

[ $FAIL -eq 0 ] && echo "[health] ESTADO: SALUDABLE" || echo "[health] ESTADO: DEGRADADO"
exit $FAIL
