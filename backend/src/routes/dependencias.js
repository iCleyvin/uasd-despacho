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

const validarDependencia = [
  body('nombre').trim().notEmpty().isLength({ max: 200 }).withMessage('Nombre requerido (máx 200 caracteres)'),
  body('codigo').trim().notEmpty().isLength({ max: 10 }).matches(/^[A-Z0-9_-]+$/i).withMessage('Código requerido (máx 10 caracteres, solo letras, números y guiones)'),
]

router.get('/', requireAuth, requirePermiso('dependencias.ver'), async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT d.*, COUNT(v.id)::int as vehiculos_count
      FROM dependencias d
      LEFT JOIN vehiculos v ON v.dependencia_id = d.id AND v.activo = true
      GROUP BY d.id ORDER BY d.nombre
    `)
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[dependencias GET /]', err.message)
    res.status(500).json({ error: 'Error al obtener dependencias' })
  }
})

router.post('/', requireAuth, requirePermiso('dependencias.editar'), validarDependencia, validar, async (req, res) => {
  try {
    const { nombre, codigo } = req.body
    const { rows } = await db.query(
      'INSERT INTO dependencias (nombre, codigo) VALUES ($1,$2) RETURNING *', [nombre.trim(), codigo.trim().toUpperCase()]
    )
    await addAudit({ accion: 'CREATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El código ya existe' })
    console.error('[dependencias POST /]', err.message)
    res.status(500).json({ error: 'Error al crear dependencia' })
  }
})

router.put('/:id', requireAuth, requirePermiso('dependencias.editar'), validarDependencia, validar, async (req, res) => {
  try {
    const { nombre, codigo } = req.body
    const { rows } = await db.query(
      'UPDATE dependencias SET nombre=$1, codigo=$2 WHERE id=$3 RETURNING *', [nombre.trim(), codigo.trim().toUpperCase(), req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
    await addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El código ya existe' })
    console.error('[dependencias PUT /:id]', err.message)
    res.status(500).json({ error: 'Error al actualizar dependencia' })
  }
})

router.patch('/:id/toggle', requireAuth, requirePermiso('dependencias.editar'), async (req, res) => {
  try {
    const { rows: cur } = await db.query('SELECT activo FROM dependencias WHERE id=$1', [req.params.id])
    if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })
    const nuevoActivo = !cur[0].activo
    const { rows } = await db.query('UPDATE dependencias SET activo=$1 WHERE id=$2 RETURNING *', [nuevoActivo, req.params.id])
    await addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo } })
    res.json(rows[0])
  } catch (err) {
    console.error('[dependencias PATCH /:id/toggle]', err.message)
    res.status(500).json({ error: 'Error al actualizar dependencia' })
  }
})

module.exports = router
