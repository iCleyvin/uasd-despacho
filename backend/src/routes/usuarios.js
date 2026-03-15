const router = require('express').Router()
const bcrypt = require('bcryptjs')
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

const SAFE_FIELDS = 'id, nombre, apellido, email, rol, activo, created_at'

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const { rows } = await db.query(`SELECT ${SAFE_FIELDS} FROM usuarios ORDER BY created_at`)
  res.json(rows)
})

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, apellido, email, password, rol } = req.body
  if (!nombre || !apellido || !email || !password || !rol)
    return res.status(400).json({ error: 'Todos los campos son requeridos' })

  const hash = await bcrypt.hash(password, 12)
  try {
    const { rows } = await db.query(`
      INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
      VALUES ($1,$2,$3,$4,$5) RETURNING ${SAFE_FIELDS}
    `, [nombre, apellido, email, hash, rol])
    await addAudit({ accion: 'CREATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_nuevo: { nombre, apellido, email, rol, password: '[REDACTED]' } })
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está en uso' })
    throw err
  }
})

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, apellido, email, password, rol } = req.body
  let hash = null
  if (password) hash = await bcrypt.hash(password, 12)

  const { rows } = hash
    ? await db.query(`UPDATE usuarios SET nombre=$1,apellido=$2,email=$3,password_hash=$4,rol=$5 WHERE id=$6 RETURNING ${SAFE_FIELDS}`,
        [nombre, apellido, email, hash, rol, req.params.id])
    : await db.query(`UPDATE usuarios SET nombre=$1,apellido=$2,email=$3,rol=$4 WHERE id=$5 RETURNING ${SAFE_FIELDS}`,
        [nombre, apellido, email, rol, req.params.id])

  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  await addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
    datos_nuevo: { nombre, apellido, email, rol, password: password ? '[REDACTED]' : undefined } })
  res.json(rows[0])
})

router.patch('/:id/toggle', requireAuth, requireRole('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' })

  const { rows: cur } = await db.query('SELECT activo FROM usuarios WHERE id=$1', [req.params.id])
  if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })

  const nuevoActivo = !cur[0].activo
  const { rows } = await db.query(
    `UPDATE usuarios SET activo=$1 WHERE id=$2 RETURNING ${SAFE_FIELDS}`, [nuevoActivo, req.params.id]
  )
  await addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
    datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo } })
  res.json(rows[0])
})

module.exports = router
