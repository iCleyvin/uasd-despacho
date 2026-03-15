const router  = require('express').Router()
const db      = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

// GET /api/despachos — con filtros y paginación
router.get('/', requireAuth, async (req, res) => {
  const { vehiculo_id, producto_id, fecha_desde, fecha_hasta, page = 1, limit = 20 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const conditions = []
  const params = []

  if (vehiculo_id)  { params.push(vehiculo_id);  conditions.push(`d.vehiculo_id  = $${params.length}`) }
  if (producto_id)  { params.push(producto_id);  conditions.push(`d.producto_id  = $${params.length}`) }
  if (fecha_desde)  { params.push(fecha_desde);  conditions.push(`d.fecha_despacho >= $${params.length}`) }
  if (fecha_hasta)  { params.push(fecha_hasta);  conditions.push(`d.fecha_despacho <= $${params.length}`) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const { rows } = await db.query(`
    SELECT d.*,
      v.placa, v.marca, v.modelo, v.tipo as vehiculo_tipo,
      p.nombre as producto_nombre, p.categoria,
      u.nombre || ' ' || u.apellido as despachador_nombre,
      dep.nombre as dependencia_nombre
    FROM despachos d
    LEFT JOIN vehiculos v ON v.id = d.vehiculo_id
    LEFT JOIN productos p ON p.id = d.producto_id
    LEFT JOIN usuarios u ON u.id = d.despachado_por
    LEFT JOIN dependencias dep ON dep.id = v.dependencia_id
    ${where}
    ORDER BY d.fecha_despacho DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset])

  const countResult = await db.query(
    `SELECT COUNT(*) FROM despachos d ${where}`, params
  )

  res.json({ data: rows, total: Number(countResult.rows[0].count) })
})

// GET /api/despachos/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT d.*,
      v.placa, v.marca, v.modelo,
      p.nombre as producto_nombre, p.unidad,
      u.nombre || ' ' || u.apellido as despachador_nombre
    FROM despachos d
    LEFT JOIN vehiculos v ON v.id = d.vehiculo_id
    LEFT JOIN productos p ON p.id = d.producto_id
    LEFT JOIN usuarios u ON u.id = d.despachado_por
    WHERE d.id = $1
  `, [req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  res.json(rows[0])
})

// POST /api/despachos
router.post('/', requireAuth, async (req, res) => {
  const { vehiculo_id, producto_id, cantidad, unidad, solicitado_por, cedula_receptor, km_vehiculo, observaciones } = req.body

  if (!vehiculo_id || !producto_id || !cantidad || !solicitado_por)
    return res.status(400).json({ error: 'Faltan campos requeridos' })

  const client = await db.pool.connect()
  try {
    await client.query('BEGIN')

    // Verificar stock
    const { rows: pRows } = await client.query(
      'SELECT * FROM productos WHERE id = $1 FOR UPDATE', [producto_id]
    )
    const producto = pRows[0]
    if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 })
    if (Number(cantidad) > Number(producto.stock_actual))
      throw Object.assign(new Error(`Stock insuficiente. Disponible: ${producto.stock_actual} ${producto.unidad}`), { status: 400 })

    // Crear despacho
    const { rows: dRows } = await client.query(`
      INSERT INTO despachos (vehiculo_id, producto_id, cantidad, unidad, despachado_por, solicitado_por, cedula_receptor, km_vehiculo, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [vehiculo_id, producto_id, cantidad, unidad ?? producto.unidad,
        req.user.id, solicitado_por, cedula_receptor ?? null,
        km_vehiculo ?? null, observaciones ?? null])

    const despacho = dRows[0]
    const stockAntes = Number(producto.stock_actual)
    const stockNuevo = stockAntes - Number(cantidad)

    // Descontar stock
    await client.query(
      'UPDATE productos SET stock_actual = $1 WHERE id = $2', [stockNuevo, producto_id]
    )

    await client.query('COMMIT')

    // Auditoría
    await addAudit({ accion: 'CREATE', tabla: 'despachos', registro_id: despacho.id, usuario_id: req.user.id, datos_nuevo: req.body })
    await addAudit({ accion: 'UPDATE', tabla: 'productos',  registro_id: producto_id,  usuario_id: req.user.id,
      datos_antes: { stock_actual: stockAntes }, datos_nuevo: { stock_actual: stockNuevo } })

    res.status(201).json(despacho)
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(err.status ?? 500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
