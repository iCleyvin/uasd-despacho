const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM productos ORDER BY categoria, nombre')
  res.json(rows)
})

// Registrar entrada de inventario
router.post('/:id/entrada', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { cantidad, notas } = req.body
  if (!cantidad || Number(cantidad) <= 0) return res.status(400).json({ error: 'Cantidad inválida' })

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
})

router.put('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { nombre, categoria, unidad, stock_minimo, precio_unitario } = req.body
  const { rows } = await db.query(`
    UPDATE productos SET nombre=$1, categoria=$2, unidad=$3, stock_minimo=$4, precio_unitario=$5
    WHERE id=$6 RETURNING *
  `, [nombre, categoria, unidad, stock_minimo, precio_unitario, req.params.id])
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  await addAudit({ accion: 'UPDATE', tabla: 'productos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
  res.json(rows[0])
})

module.exports = router
