const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requirePermiso } = require('../middleware/auth')

// GET /api/reportes/dashboard — una sola llamada con todo lo que necesita el Dashboard
router.get('/dashboard', requireAuth, requirePermiso('reportes.ver'), async (req, res) => {
  try {
    const esDespachador  = req.user.rol === 'despachador'
    const filterClause   = esDespachador ? 'AND d.despachado_por = $1' : ''
    const params         = esDespachador ? [req.user.id] : []

    const [recientes, consumo] = await Promise.all([
      db.query(`
        SELECT d.id, d.fecha_despacho, d.cantidad, d.unidad, d.solicitado_por,
          d.cedula_receptor, d.km_vehiculo, d.observaciones,
          v.placa, v.marca, v.modelo,
          p.nombre as producto_nombre, p.categoria,
          u.nombre || ' ' || u.apellido as despachador_nombre
        FROM despachos d
        LEFT JOIN vehiculos v ON v.id = d.vehiculo_id
        LEFT JOIN productos p ON p.id = d.producto_id
        LEFT JOIN usuarios u ON u.id = d.despachado_por
        WHERE 1=1 ${filterClause}
        ORDER BY d.fecha_despacho DESC
        LIMIT 10
      `, params),
      db.query(`
        SELECT DATE(fecha_despacho) as fecha,
          p.nombre as producto, p.categoria,
          SUM(d.cantidad) as total
        FROM despachos d
        JOIN productos p ON p.id = d.producto_id
        WHERE fecha_despacho >= NOW() - make_interval(days => 7)
          ${filterClause}
        GROUP BY DATE(fecha_despacho), p.nombre, p.categoria
        ORDER BY fecha
      `, params),
    ])

    res.json({
      despachos_recientes: recientes.rows,
      consumo_diario:      consumo.rows,
    })
  } catch (err) {
    console.error('[reportes/dashboard]', err.message)
    res.status(500).json({ error: 'Error al obtener datos del dashboard' })
  }
})

// Consumo diario últimos N días
// Admin/supervisor ven todo; despachador ve solo sus propios despachos
router.get('/consumo-diario', requireAuth, requirePermiso('reportes.ver'), async (req, res) => {
  try {
    const dias = Math.min(Math.max(1, parseInt(req.query.dias ?? '7', 10) || 7), 90)

    const esDespachador = req.user.rol === 'despachador'
    const extraWhere    = esDespachador ? 'AND d.despachado_por = $2' : ''
    const params        = esDespachador ? [dias, req.user.id] : [dias]

    const { rows } = await db.query(`
      SELECT
        DATE(fecha_despacho) as fecha,
        p.nombre as producto,
        p.categoria,
        SUM(d.cantidad) as total
      FROM despachos d
      JOIN productos p ON p.id = d.producto_id
      WHERE fecha_despacho >= NOW() - make_interval(days => $1)
        ${extraWhere}
      GROUP BY DATE(fecha_despacho), p.nombre, p.categoria
      ORDER BY fecha
    `, params)
    res.json(rows)
  } catch (err) {
    console.error('[reportes/consumo-diario]', err.message)
    res.status(500).json({ error: 'Error al obtener consumo diario' })
  }
})

// Consumo mensual
router.get('/consumo-mensual', requireAuth, requirePermiso('reportes.ver'), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[reportes/consumo-mensual]', err.message)
    res.status(500).json({ error: 'Error al obtener consumo mensual' })
  }
})

// Consumo por vehículo
router.get('/por-vehiculo', requireAuth, requirePermiso('reportes.ver'), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[reportes/por-vehiculo]', err.message)
    res.status(500).json({ error: 'Error al obtener reporte por vehículo' })
  }
})

module.exports = router
