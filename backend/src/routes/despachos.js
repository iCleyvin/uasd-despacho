const router  = require('express').Router()
const { body, query, param, validationResult } = require('express-validator')
const db      = require('../db')
const { requireAuth, requireRole, requirePermiso } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

function validar(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

const validarDespacho = [
  body('vehiculo_id').isInt({ min: 1 }).withMessage('Vehículo inválido'),
  body('producto_id').isInt({ min: 1 }).withMessage('Producto inválido'),
  body('cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
  body('solicitado_por').trim().notEmpty().isLength({ max: 200 }).withMessage('Nombre del solicitante requerido (máx 200 caracteres)'),
  body('cedula_receptor').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Cédula inválida (máx 20 caracteres)'),
  body('km_vehiculo').optional({ values: 'falsy' }).isInt({ min: 0, max: 9999999 }).withMessage('Kilometraje inválido'),
  body('observaciones').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Observaciones máximo 500 caracteres'),
]

const validarFiltros = [
  query('vehiculo_id').optional().isInt({ min: 1 }).withMessage('vehiculo_id inválido'),
  query('producto_id').optional().isInt({ min: 1 }).withMessage('producto_id inválido'),
  query('fecha_desde').optional().isISO8601().withMessage('fecha_desde inválida'),
  query('fecha_hasta').optional().isISO8601().withMessage('fecha_hasta inválida'),
  query('page').optional().isInt({ min: 1 }).withMessage('page inválida'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit inválido (máx 10000)'),
  query('q').optional().trim().isLength({ max: 100 }).withMessage('búsqueda máx 100 caracteres'),
  query('despacho_id').optional().isInt({ min: 1 }).withMessage('despacho_id inválido'),
]

// Helper: construye WHERE y params comunes a GET y EXPORT
function buildWhere(query, userRol, userId) {
  const conditions = []
  const params = []

  if (userRol === 'despachador') {
    params.push(userId)
    conditions.push(`d.despachado_por = $${params.length}`)
  }
  if (query.despacho_id) { params.push(query.despacho_id); conditions.push(`d.id = $${params.length}`) }
  if (query.vehiculo_id) { params.push(query.vehiculo_id); conditions.push(`d.vehiculo_id = $${params.length}`) }
  if (query.producto_id) { params.push(query.producto_id); conditions.push(`d.producto_id = $${params.length}`) }
  if (query.fecha_desde) { params.push(query.fecha_desde); conditions.push(`d.fecha_despacho >= $${params.length}`) }
  if (query.fecha_hasta) { params.push(query.fecha_hasta + 'T23:59:59'); conditions.push(`d.fecha_despacho <= $${params.length}`) }
  if (query.q) {
    // Escapar % y _ para que no actúen como comodines LIKE involuntarios
    const escaped = query.q.replace(/[%_\\]/g, c => `\\${c}`)
    params.push(`%${escaped}%`)
    conditions.push(`(v.placa ILIKE $${params.length} ESCAPE '\\' OR v.marca ILIKE $${params.length} ESCAPE '\\' OR d.solicitado_por ILIKE $${params.length} ESCAPE '\\')`)
  }
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

const SELECT_COLS = `
  d.*,
  v.placa, v.marca, v.modelo, v.tipo as vehiculo_tipo,
  p.nombre as producto_nombre, p.categoria,
  u.nombre || ' ' || u.apellido as despachador_nombre,
  dep.nombre as dependencia_nombre
`

// GET /api/despachos — con filtros y paginación
router.get('/', requireAuth, requirePermiso('despachos.ver'), validarFiltros, validar, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const { where, params } = buildWhere(req.query, req.user.rol, req.user.id)

    const [{ rows }, countResult] = await Promise.all([
      db.query(`
        SELECT ${SELECT_COLS}
        FROM despachos d
        LEFT JOIN vehiculos v   ON v.id   = d.vehiculo_id
        LEFT JOIN productos p   ON p.id   = d.producto_id
        LEFT JOIN usuarios u    ON u.id   = d.despachado_por
        LEFT JOIN dependencias dep ON dep.id = v.dependencia_id
        ${where}
        ORDER BY d.fecha_despacho DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
      db.query(
        `SELECT COUNT(*) FROM despachos d
         LEFT JOIN vehiculos v ON v.id = d.vehiculo_id
         ${where}`, params
      )
    ])

    res.json({ data: rows, total: Number(countResult.rows[0].count) })
  } catch (err) {
    console.error('[despachos GET /]', err.message)
    res.status(500).json({ error: 'Error al obtener despachos' })
  }
})

// GET /api/despachos/export — descarga CSV con todos los registros filtrados
router.get('/export', requireAuth, requirePermiso('despachos.ver'), validarFiltros, validar, async (req, res) => {
  try {
    const { where, params } = buildWhere(req.query, req.user.rol, req.user.id)
    const { rows } = await db.query(`
      SELECT ${SELECT_COLS}
      FROM despachos d
      LEFT JOIN vehiculos v   ON v.id   = d.vehiculo_id
      LEFT JOIN productos p   ON p.id   = d.producto_id
      LEFT JOIN usuarios u    ON u.id   = d.despachado_por
      LEFT JOIN dependencias dep ON dep.id = v.dependencia_id
      ${where}
      ORDER BY d.fecha_despacho DESC
    `, params)

    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['ID','Fecha','Placa','Marca','Modelo','Dependencia','Producto','Categoria','Cantidad','Unidad','Solicitado por','Cedula receptor','Km vehiculo','Despachado por','Observaciones']
    const lines = [
      headers.join(','),
      ...rows.map(d => [
        d.id,
        d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleString('es-DO') : '',
        d.placa, d.marca, d.modelo, d.dependencia_nombre,
        d.producto_nombre, d.categoria,
        d.cantidad, d.unidad,
        d.solicitado_por, d.cedula_receptor, d.km_vehiculo,
        d.despachador_nombre, d.observaciones,
      ].map(esc).join(',')),
    ]

    const fecha = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="despachos_${fecha}.csv"`)
    res.send('\uFEFF' + lines.join('\r\n'))
  } catch (err) {
    console.error('[despachos GET /export]', err.message)
    res.status(500).json({ error: 'Error al exportar despachos' })
  }
})

// GET /api/despachos/:id
router.get('/:id', requireAuth, requirePermiso('despachos.ver'), [param('id').isInt({ min: 1 }).withMessage('ID inválido')], validar, async (req, res) => {
  try {
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

    // Despachador solo puede ver sus propios despachos
    if (req.user.rol === 'despachador' && rows[0].despachado_por !== req.user.id)
      return res.status(403).json({ error: 'Sin acceso a este despacho' })

    res.json(rows[0])
  } catch (err) {
    console.error('[despachos GET /:id]', err.message)
    res.status(500).json({ error: 'Error al obtener despacho' })
  }
})

// POST /api/despachos
router.post('/', requireAuth, requirePermiso('despachos.crear'), validarDespacho, validar, async (req, res) => {
  const { vehiculo_id, producto_id, cantidad, unidad, solicitado_por, cedula_receptor, km_vehiculo, observaciones } = req.body

  const client = await db.pool.connect()
  try {
    await client.query('BEGIN')

    // Verificar que el vehículo existe y está activo
    const { rows: vRows } = await client.query('SELECT activo FROM vehiculos WHERE id = $1', [vehiculo_id])
    if (!vRows[0]) throw Object.assign(new Error('Vehículo no encontrado'), { status: 404 })
    if (!vRows[0].activo) throw Object.assign(new Error('El vehículo está inactivo y no puede recibir despachos'), { status: 400 })

    // Verificar stock
    const { rows: pRows } = await client.query(
      'SELECT * FROM productos WHERE id = $1 FOR UPDATE', [producto_id]
    )
    const producto = pRows[0]
    if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 })
    if (Number(cantidad) > Number(producto.stock_actual))
      throw Object.assign(new Error('Stock insuficiente para completar el despacho'), { status: 400 })

    // Crear despacho
    const { rows: dRows } = await client.query(`
      INSERT INTO despachos (vehiculo_id, producto_id, cantidad, unidad, despachado_por, solicitado_por, cedula_receptor, km_vehiculo, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [vehiculo_id, producto_id, cantidad, unidad ?? producto.unidad,
        req.user.id, solicitado_por.trim(), cedula_receptor?.trim() ?? null,
        km_vehiculo ?? null, observaciones?.trim() ?? null])

    const despacho = dRows[0]
    const stockAntes = Number(producto.stock_actual)
    const stockNuevo = stockAntes - Number(cantidad)

    // Descontar stock
    await client.query(
      'UPDATE productos SET stock_actual = $1 WHERE id = $2', [stockNuevo, producto_id]
    )

    // Auditoría dentro de la transacción — garantiza consistencia si el servidor muere tras el COMMIT
    await addAudit({ accion: 'CREATE', tabla: 'despachos', registro_id: despacho.id, usuario_id: req.user.id, datos_nuevo: req.body, client })
    await addAudit({ accion: 'UPDATE', tabla: 'productos',  registro_id: producto_id,  usuario_id: req.user.id,
      datos_antes: { stock_actual: stockAntes }, datos_nuevo: { stock_actual: stockNuevo }, client })

    await client.query('COMMIT')

    res.status(201).json(despacho)
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) { /* ignorar error de rollback */ }
    console.error('[despachos POST /]', err.message)
    res.status(err.status ?? 500).json({ error: err.message })
  } finally {
    client.release()
  }
})

module.exports = router
