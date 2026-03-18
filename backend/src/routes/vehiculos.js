const router = require('express').Router()
const { body, param, validationResult } = require('express-validator')
const db     = require('../db')
const { requireAuth, requireRole, requirePermiso } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

function validar(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

const TIPOS_VALIDOS = ['Sedan', 'Jeepeta', 'Pickup', 'Camion', 'Microbus', 'Minibus', 'Autobus', 'Motocicleta', 'Tren']
const COMBUSTIBLES  = ['Gasolina', 'Gasoil', 'Electrico', 'Hibrido']

const validarVehiculo = [
  body('placa').trim().notEmpty().isLength({ max: 20 }).withMessage('Placa requerida (máx 20 caracteres)'),
  body('marca').trim().notEmpty().isLength({ max: 100 }).withMessage('Marca requerida (máx 100 caracteres)'),
  body('modelo').trim().notEmpty().isLength({ max: 100 }).withMessage('Modelo requerido (máx 100 caracteres)'),
  body('anio').optional({ values: 'falsy' }).isInt({ min: 1950, max: new Date().getFullYear() + 1 }).withMessage('Año inválido'),
  body('tipo').optional({ values: 'falsy' }).isIn(TIPOS_VALIDOS).withMessage(`Tipo inválido. Valores: ${TIPOS_VALIDOS.join(', ')}`),
  body('combustible').optional({ values: 'falsy' }).isIn(COMBUSTIBLES).withMessage(`Combustible inválido. Valores: ${COMBUSTIBLES.join(', ')}`),
  body('dependencia_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Dependencia inválida'),
  body('color').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('Color máx 50 caracteres'),
  body('ficha_vieja').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Ficha máx 20 caracteres'),
  body('matricula').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Matrícula máx 30 caracteres'),
  body('chasis').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Chasis máx 100 caracteres'),
]

router.get('/', requireAuth, requirePermiso('vehiculos.ver'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, d.nombre as dependencia_nombre
      FROM vehiculos v
      LEFT JOIN dependencias d ON d.id = v.dependencia_id
      ORDER BY v.placa
    `)
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[vehiculos GET /]', err.message)
    res.status(500).json({ error: 'Error al obtener vehículos' })
  }
})

router.get('/:id', requireAuth, requirePermiso('vehiculos.ver'), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('[vehiculos GET /:id]', err.message)
    res.status(500).json({ error: 'Error al obtener vehículo' })
  }
})

router.post('/', requireAuth, requirePermiso('vehiculos.editar'), validarVehiculo, validar, async (req, res) => {
  try {
    const { placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis } = req.body
    if (!placa || !marca || !modelo) return res.status(400).json({ error: 'Faltan campos requeridos' })

    const { rows } = await db.query(`
      INSERT INTO vehiculos (placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [placa.trim().toUpperCase(), marca, modelo, anio ?? null, tipo ?? null, color ?? '',
        dependencia_id ?? null, combustible ?? 'gasolina',
        ficha_vieja || null, matricula || null, chasis || null])

    await addAudit({ accion: 'CREATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'La placa ya está registrada' })
    console.error('[vehiculos POST /]', err.message)
    res.status(500).json({ error: 'Error al crear vehículo' })
  }
})

router.put('/:id', requireAuth, requirePermiso('vehiculos.editar'), [param('id').isInt({ min: 1 })], validarVehiculo, validar, async (req, res) => {
  try {
    const { placa, marca, modelo, anio, tipo, color, dependencia_id, combustible, ficha_vieja, matricula, chasis } = req.body
    if (!placa || !marca || !modelo) return res.status(400).json({ error: 'Faltan campos requeridos' })
    const { rows } = await db.query(`
      UPDATE vehiculos SET placa=$1, marca=$2, modelo=$3, anio=$4, tipo=$5, color=$6, dependencia_id=$7, combustible=$8,
        ficha_vieja=$9, matricula=$10, chasis=$11
      WHERE id=$12 RETURNING *
    `, [placa.trim().toUpperCase(), marca, modelo, anio ?? null, tipo ?? null, color ?? '',
        dependencia_id ?? null, combustible ?? 'gasolina',
        ficha_vieja || null, matricula || null, chasis || null, req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
    await addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: req.body })
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'La placa ya está registrada' })
    console.error('[vehiculos PUT /:id]', err.message)
    res.status(500).json({ error: 'Error al actualizar vehículo' })
  }
})

router.patch('/:id/toggle', requireAuth, requirePermiso('vehiculos.editar'), async (req, res) => {
  try {
    const { rows: cur } = await db.query('SELECT activo FROM vehiculos WHERE id=$1', [req.params.id])
    if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })

    const nuevoActivo = !cur[0].activo
    const { rows } = await db.query('UPDATE vehiculos SET activo=$1 WHERE id=$2 RETURNING *', [nuevoActivo, req.params.id])
    await addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo } })
    res.json(rows[0])
  } catch (err) {
    console.error('[vehiculos PATCH /:id/toggle]', err.message)
    res.status(500).json({ error: 'Error al actualizar vehículo' })
  }
})

module.exports = router
