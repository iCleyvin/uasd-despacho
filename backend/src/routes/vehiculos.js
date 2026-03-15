const router = require('express').Router()
const db     = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(`
    SELECT v.*, d.nombre as dependencia_nombre
    FROM vehiculos v
    LEFT JOIN dependencias d ON d.id = v.dependencia_id
    ORDER BY v.placa
  `)
  res.json(rows)
})

router.get('/:id', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT v.*, d.nombre as dependencia_nombre FROM vehiculos v
     LEFT JOIN dependencias d ON d.id = v.dependencia_id WHERE v.id = $1`,
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })

  const { rows: despachos } = await db.query(`
    SELECT d.*, p.nombre as producto_nombre FROM despachos d
    LEFT JOIN productos p ON p.id = d.producto_id
    WHERE d.vehiculo_id = $1 ORDER BY d.fecha_despacho DESC LIMIT 10
  `, [req.params.id])

  res.json({ ...rows[0], despachos })
})

router.post('/', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis } = req.body
  if (!placa || !marca || !modelo) return res.status(400).json({ error: 'Faltan campos requeridos' })

  const { rows } = await db.query(`
    INSERT INTO vehiculos (placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
  `, [placa, marca, modelo, anio ?? null, tipo ?? null, color ?? '', dependencia_id ?? null, combustible ?? 'gasolina',
      ficha_vieja || null, matricula || null, chasis || null])

  await addAudit({ accion: 'CREATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
  res.status(201).json(rows[0])
})

router.put('/:id', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis } = req.body
  const { rows } = await db.query(`
    UPDATE vehiculos SET placa=$1, marca=$2, modelo=$3, anio=$4, tipo=$5, color=$6, dependencia_id=$7, combustible=$8,
      ficha_vieja=$9, matricula=$10, chasis=$11
    WHERE id=$12 RETURNING *
  `, [placa, marca, modelo, anio ?? null, tipo ?? null, color ?? '', dependencia_id ?? null, combustible ?? 'gasolina',
      ficha_vieja || null, matricula || null, chasis || null, req.params.id])

  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
  await addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
  res.json(rows[0])
})

router.patch('/:id/toggle', requireAuth, requireRole('admin', 'supervisor'), async (req, res) => {
  const { rows: cur } = await db.query('SELECT activo FROM vehiculos WHERE id=$1', [req.params.id])
  if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })

  const nuevoActivo = !cur[0].activo
  const { rows } = await db.query('UPDATE vehiculos SET activo=$1 WHERE id=$2 RETURNING *', [nuevoActivo, req.params.id])
  await addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id,
    datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo } })
  res.json(rows[0])
})

module.exports = router
