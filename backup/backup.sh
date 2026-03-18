#!/bin/sh
# Backup diario de PostgreSQL — UASD Despacho
# Retención: 7 diarios + 4 semanales (lunes) + 12 mensuales (día 1)
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DOW=$(date +%u)   # 1=lunes … 7=domingo
DOM=$(date +%d)   # día del mes (01-31)

DAILY_FILE="/backups/daily/uasd_despacho_${TIMESTAMP}.sql.gz"
mkdir -p /backups/daily /backups/weekly /backups/monthly

# ── Comprobar espacio disponible (mín 500 MB) ─────────────────────────────────
AVAIL_KB=$(df /backups | awk 'NR==2 {print $4}')
if [ "${AVAIL_KB:-0}" -lt 512000 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: espacio insuficiente en /backups (${AVAIL_KB} KB libres). Backup cancelado."
  exit 1
fi

# ── Backup diario ─────────────────────────────────────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup diario..."
pg_dump -h db -U "${PGUSER:-uasd}" "${PGDATABASE:-uasd_despacho}" | gzip > "$DAILY_FILE"
SIZE=$(du -sh "$DAILY_FILE" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup diario completado: $(basename $DAILY_FILE) ($SIZE)"

# ── Copia semanal (cada lunes) ────────────────────────────────────────────────
if [ "$DOW" = "1" ]; then
  WEEKLY_FILE="/backups/weekly/uasd_despacho_week_${TIMESTAMP}.sql.gz"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup semanal guardado: $(basename $WEEKLY_FILE)"
fi

# ── Copia mensual (cada día 1) ────────────────────────────────────────────────
if [ "$DOM" = "01" ]; then
  MONTHLY_FILE="/backups/monthly/uasd_despacho_month_${TIMESTAMP}.sql.gz"
  cp "$DAILY_FILE" "$MONTHLY_FILE"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup mensual guardado: $(basename $MONTHLY_FILE)"
fi

# ── Rotación ──────────────────────────────────────────────────────────────────
rotate() {
  DIR="$1"; KEEP="$2"; LABEL="$3"
  COUNT=$(ls "$DIR"/*.sql.gz 2>/dev/null | wc -l)
  if [ "$COUNT" -gt "$KEEP" ]; then
    TO_DEL=$((COUNT - KEEP))
    ls -t "$DIR"/*.sql.gz | tail -n "+$((KEEP + 1))" | xargs rm -f
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotación $LABEL: eliminados $TO_DEL backups."
  fi
}

rotate /backups/daily   7  "diaria   (retención 7 días)"
rotate /backups/weekly  4  "semanal  (retención 4 semanas)"
rotate /backups/monthly 12 "mensual  (retención 12 meses)"
