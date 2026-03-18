const router = require('express').Router()
const { body, param, query: qv, validationResult } = require('express-validator')
const db     = require('../db')
const { requireAuth, requireRole, requirePermiso } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

function validar(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

const CATEGORIAS = ['combustible', 'aceite_motor', 'aceite_transmision', 'repuesto', 'otro']

const validarProducto = [
  body('nombre').trim().notEmpty().isLength({ max: 200 }).withMessage('Nombre requerido (máx 200 caracteres)'),
  body('categoria').trim().notEmpty()
    .isIn(['combustible','aceite_motor','aceite_transmision','repuesto','otro'])
    .withMessage('Categoría inválida'),
  body('unidad').trim().notEmpty().isLength({ max: 50 }).withMessage('Unidad requerida (máx 50 caracteres)'),
  body('stock_minimo').isFloat({ min: 0 }).withMessage('Stock mínimo debe ser ≥ 0'),
  body('precio_unitario').isFloat({ min: 0 }).withMessage('Precio debe ser ≥ 0'),
]

const validarEntrada = [
  body('cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
  body('notas').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notas máx 500 caracteres'),
]

router.get('/', requireAuth, requirePermiso('inventario.ver'), [
  qv('page').optional().isInt({ min: 1 }).withMessage('page inválida'),
  qv('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit inválido (máx 200)'),
  qv('categoria').optional().isIn(CATEGORIAS).withMessage('Categoría inválida'),
  qv('q').optional().trim().isLength({ max: 100 }).withMessage('búsqueda máx 100 caracteres'),
], validar, async (req, res) => {
  try {
    const { page = 1, limit = 50, categoria, q } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conds  = []
    const params = []
    if (categoria) { params.push(categoria); conds.push(`categoria = $${params.length}`) }
    if (q) {
      const escaped = q.replace(/[%_\\]/g, c => `\\${c}`)
      params.push(`%${escaped}%`)
      conds.push(`nombre ILIKE $${params.length} ESCAPE '\\'`)
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const [{ rows }, countResult] = await Promise.all([
      db.query(
        `SELECT * FROM productos ${where} ORDER BY categoria, nombre LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      ),
      db.query(`SELECT COUNT(*) FROM productos ${where}`, params),
    ])

    res.json({ data: rows, total: Number(countResult.rows[0].count) })
  } catch (err) {
    console.error('[productos GET /]', err.message)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

router.post('/', requireAuth, requirePermiso('inventario.editar'), validarProducto, validar, async (req, res) => {
  try {
    const { nombre, categoria, unidad, stock_minimo, precio_unitario } = req.body
    const { rows } = await db.query(
      'INSERT INTO productos (nombre, categoria, unidad, stock_minimo, precio_unitario) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre, categoria, unidad, stock_minimo, precio_unitario]
    )
    await addAudit({ accion: 'CREATE', tabla: 'productos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[productos POST /]', err.message)
    res.status(500).json({ error: 'Error al crear producto' })
  }
})

router.patch('/:id/toggle', requireAuth, requirePermiso('inventario.editar'), [param('id').isInt()], validar, async (req, res) => {
  try {
    const { rows } = await db.query(
      'UPDATE productos SET activo = NOT activo WHERE id=$1 RETURNING *', [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
    await addAudit({ accion: 'UPDATE', tabla: 'productos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: { activo: rows[0].activo } })
    res.json(rows[0])
  } catch (err) {
    console.error('[productos PATCH /:id/toggle]', err.message)
    res.status(500).json({ error: 'Error al cambiar estado del producto' })
  }
})

// Registrar entrada de inventario — UPDATE atómico para evitar race conditions
router.post('/:id/entrada', requireAuth, requirePermiso('inventario.editar'), validarEntrada, validar, async (req, res) => {
  const client = await db.pool.connect()
  try {
    const { cantidad, notas } = req.body
    await client.query('BEGIN')

    // SELECT FOR UPDATE + UPDATE en una sola transacción: ninguna otra entrada
    // puede leer el mismo row hasta que hagamos COMMIT
    const { rows: locked } = await client.query(
      'SELECT id, stock_actual FROM productos WHERE id=$1 FOR UPDATE', [req.params.id]
    )
    if (!locked[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'No encontrado' }) }

    const stockAntes = Number(locked[0].stock_actual)
    const stockNuevo = stockAntes + Number(cantidad)

    const { rows } = await client.query(
      'UPDATE productos SET stock_actual=$1 WHERE id=$2 RETURNING *', [stockNuevo, req.params.id]
    )

    await addAudit({
      accion: 'ENTRADA', tabla: 'productos', registro_id: locked[0].id, usuario_id: req.user.id,
      datos_antes: { stock_actual: stockAntes },
      datos_nuevo: { stock_actual: stockNuevo, cantidad_entrada: Number(cantidad), notas: notas ?? '' },
      client,
    })

    await client.query('COMMIT')

    res.json(rows[0])
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) { /* ignorar */ }
    console.error('[productos POST /:id/entrada]', err.message)
    res.status(500).json({ error: 'Error al registrar entrada' })
  } finally {
    client.release()
  }
})

router.put('/:id', requireAuth, requirePermiso('inventario.editar'), validarProducto, validar, async (req, res) => {
  try {
    const { nombre, categoria, unidad, stock_minimo, precio_unitario } = req.body
    const { rows } = await db.query(`
      UPDATE productos SET nombre=$1, categoria=$2, unidad=$3, stock_minimo=$4, precio_unitario=$5
      WHERE id=$6 RETURNING *
    `, [nombre, categoria, unidad, stock_minimo, precio_unitario, req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
    await addAudit({ accion: 'UPDATE', tabla: 'productos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.json(rows[0])
  } catch (err) {
    console.error('[productos PUT /:id]', err.message)
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

// ── Historial combinado (entradas + despachos) ────────────────────────────────
router.get('/movimientos', requireAuth, requirePermiso('inventario.ver'), [
  qv('producto_id').optional().isInt({ min: 1 }),
  qv('tipo').optional().isIn(['entrada', 'despacho']).withMessage('tipo inválido'),
  qv('fecha_desde').optional().isISO8601().withMessage('fecha_desde inválida'),
  qv('fecha_hasta').optional().isISO8601().withMessage('fecha_hasta inválida'),
  qv('page').optional().isInt({ min: 1 }),
  qv('limit').optional().isInt({ min: 1, max: 5000 }),
], validar, async (req, res) => {
  try {
    const { producto_id, tipo, fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    const conds = []
    const params = []
    if (producto_id) { params.push(Number(producto_id)); conds.push(`m.producto_id = $${params.length}`) }
    if (tipo)        { params.push(tipo);                 conds.push(`m.tipo        = $${params.length}`) }
    if (fecha_desde) { params.push(fecha_desde);          conds.push(`m.fecha       >= $${params.length}`) }
    if (fecha_hasta) { params.push(fecha_hasta + 'T23:59:59'); conds.push(`m.fecha   <= $${params.length}`) }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const cte = `
      WITH m AS (
        SELECT
          a.id,
          a.created_at                                    AS fecha,
          'entrada'                                       AS tipo,
          a.registro_id                                   AS producto_id,
          p.nombre                                        AS producto_nombre,
          p.unidad,
          (a.datos_nuevo->>'cantidad_entrada')::numeric   AS cantidad,
          a.datos_nuevo->>'notas'                         AS notas,
          u.nombre || ' ' || u.apellido                   AS usuario_nombre,
          (a.datos_antes->>'stock_actual')::numeric       AS stock_antes,
          (a.datos_nuevo->>'stock_actual')::numeric       AS stock_despues,
          NULL::text                                      AS vehiculo_placa,
          NULL::text                                      AS solicitado_por
        FROM auditoria a
        JOIN  productos p  ON p.id = a.registro_id
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        WHERE a.tabla = 'productos' AND a.accion = 'ENTRADA'

        UNION ALL

        SELECT
          d.id,
          d.fecha_despacho  AS fecha,
          'despacho'        AS tipo,
          d.producto_id,
          p.nombre          AS producto_nombre,
          d.unidad,
          d.cantidad,
          d.observaciones   AS notas,
          u.nombre || ' ' || u.apellido AS usuario_nombre,
          NULL::numeric     AS stock_antes,
          NULL::numeric     AS stock_despues,
          v.placa           AS vehiculo_placa,
          d.solicitado_por
        FROM despachos d
        JOIN  productos p    ON p.id = d.producto_id
        LEFT JOIN usuarios u ON u.id = d.despachado_por
        LEFT JOIN vehiculos v ON v.id = d.vehiculo_id
      )
    `

    const [{ rows }, countResult] = await Promise.all([
      db.query(
        `${cte} SELECT * FROM m ${where} ORDER BY fecha DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      ),
      db.query(`${cte} SELECT COUNT(*) FROM m ${where}`, params),
    ])

    res.json({ data: rows, total: Number(countResult.rows[0].count) })
  } catch (err) {
    console.error('[productos GET /movimientos]', err.message)
    res.status(500).json({ error: 'Error al obtener movimientos' })
  }
})

// ── Importación masiva de productos ──────────────────────────────────────────
router.post('/importar', requireAuth, requirePermiso('inventario.editar'), [
  body('items').isArray({ min: 1, max: 500 }).withMessage('items debe ser un arreglo de 1 a 500 elementos'),
], validar, async (req, res) => {
  const { items } = req.body
  const client = await db.pool.connect()
  try {
    await client.query('BEGIN')

    const creados    = []
    const existentes = []
    const errores    = []

    for (let i = 0; i < items.length; i++) {
      const fila = i + 2 // fila 1 = encabezado
      const item = items[i]

      const nombre          = String(item.nombre          ?? '').trim()
      const categoria       = String(item.categoria       ?? '').trim().toLowerCase().replace(/\s+/g, '_')
      const unidad          = String(item.unidad          ?? '').trim()
      const stock_minimo    = Number(item.stock_minimo)
      const precio_unitario = Number(item.precio_unitario)
      const stock_inicial   = Number(item.stock_inicial   ?? 0)

      if (!nombre)                              { errores.push({ fila, error: 'Nombre requerido' });          continue }
      if (!categoria)                           { errores.push({ fila, error: 'Categoría requerida' });       continue }
      if (!unidad)                              { errores.push({ fila, error: 'Unidad requerida' });          continue }
      if (isNaN(stock_minimo)    || stock_minimo    < 0) { errores.push({ fila, error: 'Stock mínimo inválido' });    continue }
      if (isNaN(precio_unitario) || precio_unitario < 0) { errores.push({ fila, error: 'Precio unitario inválido' }); continue }
      if (isNaN(stock_inicial)   || stock_inicial   < 0) { errores.push({ fila, error: 'Stock inicial inválido' });   continue }

      // ¿Existe el producto?
      const { rows: existing } = await client.query(
        'SELECT id, stock_actual FROM productos WHERE LOWER(nombre) = LOWER($1)', [nombre]
      )

      let productoId
      if (existing.length > 0) {
        productoId = existing[0].id
        existentes.push({ fila, nombre })
      } else {
        const { rows: newProd } = await client.query(
          'INSERT INTO productos (nombre, categoria, unidad, stock_minimo, precio_unitario) VALUES ($1,$2,$3,$4,$5) RETURNING id',
          [nombre, categoria, unidad, stock_minimo, precio_unitario]
        )
        productoId = newProd[0].id
        creados.push({ fila, nombre })
      }

      // Registrar stock inicial si > 0
      if (stock_inicial > 0) {
        const { rows: locked } = await client.query(
          'SELECT stock_actual FROM productos WHERE id=$1 FOR UPDATE', [productoId]
        )
        const stockAntes = Number(locked[0].stock_actual)
        const stockNuevo = stockAntes + stock_inicial
        await client.query('UPDATE productos SET stock_actual=$1 WHERE id=$2', [stockNuevo, productoId])
      }
    }

    await addAudit({
      accion: 'IMPORTAR', tabla: 'productos', registro_id: null, usuario_id: req.user.id,
      datos_nuevo: { importacion: true, creados: creados.length, existentes: existentes.length, errores: errores.length },
      client,
    })

    await client.query('COMMIT')

    const { rows: updatedProducts } = await db.query('SELECT * FROM productos ORDER BY categoria, nombre')
    res.json({ creados: creados.length, existentes: existentes.length, errores, productos: updatedProducts })
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) { /* ignorar */ }
    console.error('[productos POST /importar]', err.message)
    res.status(500).json({ error: 'Error al importar productos' })
  } finally {
    client.release()
  }
})

module.exports = router
