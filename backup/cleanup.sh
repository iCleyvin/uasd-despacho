#!/bin/sh
# Limpieza mensual de auditoría — retener solo los últimos 6 meses
set -e

MESES=${AUDITORIA_RETENTION_MONTHS:-6}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando limpieza de auditoría (>${MESES} meses)..."

DELETED=$(psql -h db -U "${PGUSER:-uasd}" "${PGDATABASE:-uasd_despacho}" -t -c \
  "DELETE FROM auditoria WHERE created_at < NOW() - make_interval(months => ${MESES}) RETURNING id;" \
  | grep -c '[0-9]' || echo 0)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Limpieza completada: ${DELETED} registros eliminados."
