const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

// Consumo diario últimos N días
router.get('/consumo-diario', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const dias = Math.min(Number(req.query.dias ?? 7), 90)
  const { rows } = await db.query(`
    SELECT
      DATE(fecha_despacho) as fecha,
      p.categoria,
      SUM(d.cantidad) as total
    FROM despachos d
    JOIN productos p ON p.id = d.producto_id
    WHERE fecha_despacho >= NOW() - INTERVAL '${dias} days'
    GROUP BY DATE(fecha_despacho), p.categoria
    ORDER BY fecha
  `)
  res.json(rows)
})

// Consumo mensual
router.get('/consumo-mensual', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', fecha_despacho), 'YYYY-MM') as mes,
      p.categoria,
      SUM(d.cantidad) as total
    FROM despachos d
    JOIN productos p ON p.id = d.producto_id
    WHERE fecha_despacho >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', fecha_despacho), p.categoria
    ORDER BY mes
  `)
  res.json(rows)
})

// Consumo por vehículo
router.get('/por-vehiculo', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      v.placa, v.marca, v.modelo, dep.nombre as dependencia,
      p.nombre as producto, p.categoria,
      SUM(d.cantidad) as total, COUNT(d.id)::int as despachos,
      MAX(d.fecha_despacho) as ultimo_despacho
    FROM despachos d
    JOIN vehiculos v ON v.id = d.vehiculo_id
    JOIN productos p ON p.id = d.producto_id
    LEFT JOIN dependencias dep ON dep.id = v.dependencia_id
    GROUP BY v.placa, v.marca, v.modelo, dep.nombre, p.nombre, p.categoria
    ORDER BY total DESC
  `)
  res.json(rows)
})

module.exports = router
