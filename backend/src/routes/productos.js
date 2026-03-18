const router = require('express').Router()
const { body, validationResult } = require('express-validator')
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
  body('categoria').trim().notEmpty().isLength({ max: 50 }).withMessage('Categoría requerida (máx 50 caracteres)'),
  body('unidad').trim().notEmpty().isLength({ max: 50 }).withMessage('Unidad requerida (máx 50 caracteres)'),
  body('stock_minimo').isFloat({ min: 0 }).withMessage('Stock mínimo debe ser ≥ 0'),
  body('precio_unitario').isFloat({ min: 0 }).withMessage('Precio debe ser ≥ 0'),
]

const validarEntrada = [
  body('cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
  body('notas').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Notas máx 500 caracteres'),
]

router.get('/', requireAuth, requirePermiso('inventario.ver'), async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM productos ORDER BY categoria, nombre')
    res.json({ data: rows, total: rows.length })
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

router.patch('/:id/toggle', requireAuth, requirePermiso('inventario.editar'), async (req, res) => {
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

// Registrar entrada de inventario
router.post('/:id/entrada', requireAuth, requirePermiso('inventario.editar'), validarEntrada, validar, async (req, res) => {
  try {
    const { cantidad, notas } = req.body

    const { rows: cur } = await db.query('SELECT * FROM productos WHERE id=$1', [req.params.id])
    if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })

    const stockAntes = Number(cur[0].stock_actual)
    const stockNuevo = stockAntes + Number(cantidad)

    const { rows } = await db.query(
      'UPDATE productos SET stock_actual=$1 WHERE id=$2 RETURNING *', [stockNuevo, req.params.id]
    )

    await addAudit({
      accion: 'ENTRADA', tabla: 'productos', registro_id: cur[0].id, usuario_id: req.user.id,
      datos_antes: { stock_actual: stockAntes },
      datos_nuevo: { stock_actual: stockNuevo, cantidad_entrada: Number(cantidad), notas: notas ?? '' },
    })

    res.json(rows[0])
  } catch (err) {
    console.error('[productos POST /:id/entrada]', err.message)
    res.status(500).json({ error: 'Error al registrar entrada' })
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

module.exports = router
