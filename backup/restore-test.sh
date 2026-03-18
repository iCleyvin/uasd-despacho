#!/bin/sh
# Prueba de restauración de backup — UASD Despacho
# Verifica que el backup más reciente se puede restaurar correctamente.
# Ejecutar manualmente o desde un cron semanal (ej. domingos 04:00).
#
# Uso desde Docker:
#   docker compose exec backup sh /tmp/restore-test.sh
set -e

TEST_DB="uasd_restore_test_$$"
BACKUP_DIR="/backups/daily"
LATEST=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === PRUEBA DE RESTAURACIÓN ==="

if [ -z "$LATEST" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: No se encontraron backups en $BACKUP_DIR"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup a probar: $(basename $LATEST) ($(du -sh $LATEST | cut -f1))"

# Verificar que el archivo no está vacío ni corrupto
gunzip -t "$LATEST" 2>/dev/null || {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: El backup está corrupto o no es un .gz válido."
  exit 1
}
echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: integridad gzip verificada."

# Crear base de datos temporal
PGPASSWORD="${PGPASSWORD}" psql -h db -U "${PGUSER:-uasd}" -d postgres \
  -c "CREATE DATABASE \"$TEST_DB\";" >/dev/null 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Base de datos temporal creada: $TEST_DB"

# Restaurar
gunzip -c "$LATEST" | PGPASSWORD="${PGPASSWORD}" psql -h db -U "${PGUSER:-uasd}" -d "$TEST_DB" \
  -v ON_ERROR_STOP=1 --quiet

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada. Verificando datos..."

# Verificar que las tablas principales tienen datos
for TABLE in usuarios dependencias vehiculos productos; do
  COUNT=$(PGPASSWORD="${PGPASSWORD}" psql -h db -U "${PGUSER:-uasd}" -d "$TEST_DB" \
    -t -c "SELECT COUNT(*) FROM $TABLE;" | tr -d ' ')
  if [ "${COUNT:-0}" -eq "0" ] && [ "$TABLE" != "despachos" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ADVERTENCIA: la tabla $TABLE está vacía."
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $TABLE = $COUNT registros"
  fi
done

# Limpiar base temporal
PGPASSWORD="${PGPASSWORD}" psql -h db -U "${PGUSER:-uasd}" -d postgres \
  -c "DROP DATABASE \"$TEST_DB\";" >/dev/null 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Base de datos temporal eliminada."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] === PRUEBA EXITOSA: el backup es válido y restaurable ==="
