const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await db.query(`
    SELECT d.*, COUNT(v.id)::int as vehiculos_count
    FROM dependencias d
    LEFT JOIN vehiculos v ON v.dependencia_id = d.id AND v.activo = true
    GROUP BY d.id ORDER BY d.nombre
  `)
  res.json(rows)
})

router.post('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { nombre, codigo } = req.body
  if (!nombre || !codigo) return res.status(400).json({ error: 'Nombre y código requeridos' })
  const { rows } = await db.query(
    'INSERT INTO dependencias (nombre, codigo) VALUES ($1,$2) RETURNING *', [nombre, codigo]
  )
  await addAudit({ accion: 'CREATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
  res.status(201).json(rows[0])
})

router.put('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { nombre, codigo } = req.body
  const { rows } = await db.query(
    'UPDATE dependencias SET nombre=$1, codigo=$2 WHERE id=$3 RETURNING *', [nombre, codigo, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  await addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
  res.json(rows[0])
})

router.patch('/:id/toggle', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { rows: cur } = await db.query('SELECT activo FROM dependencias WHERE id=$1', [req.params.id])
  if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })
  const nuevoActivo = !cur[0].activo
  const { rows } = await db.query('UPDATE dependencias SET activo=$1 WHERE id=$2 RETURNING *', [nuevoActivo, req.params.id])
  await addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id,
    datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo } })
  res.json(rows[0])
})

module.exports = router
