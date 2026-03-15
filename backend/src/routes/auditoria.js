const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

router.get('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { tabla, accion, usuario_id, page = 1, limit = 50 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const conditions = []
  const params = []

  if (tabla)      { params.push(tabla);      conditions.push(`a.tabla      = $${params.length}`) }
  if (accion)     { params.push(accion);     conditions.push(`a.accion     = $${params.length}`) }
  if (usuario_id) { params.push(usuario_id); conditions.push(`a.usuario_id = $${params.length}`) }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

  const { rows } = await db.query(`
    SELECT a.*, u.nombre || ' ' || u.apellido as usuario_nombre
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `, [...params, limit, offset])

  const countResult = await db.query(`SELECT COUNT(*) FROM auditoria a ${where}`, params)
  res.json({ data: rows, total: Number(countResult.rows[0].count) })
})

module.exports = router
