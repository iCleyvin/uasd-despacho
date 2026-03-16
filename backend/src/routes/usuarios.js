const router = require('express').Router()
const bcrypt = require('bcryptjs')
const db     = require('../db')
const { body, param, validationResult } = require('express-validator')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

const SAFE_FIELDS = 'id, nombre, apellido, email, rol, activo, created_at'
const ROLES_VALIDOS = ['admin', 'supervisor', 'despachador']

// Política de contraseñas: mínimo 8 chars, al menos 1 mayúscula, 1 número, 1 símbolo
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/

const validarUsuario = [
  body('nombre').trim().notEmpty().isLength({ max: 100 }).withMessage('Nombre requerido (máx 100 caracteres)'),
  body('apellido').trim().notEmpty().isLength({ max: 100 }).withMessage('Apellido requerido (máx 100 caracteres)'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Email inválido'),
  body('rol').isIn(ROLES_VALIDOS).withMessage(`Rol inválido. Debe ser: ${ROLES_VALIDOS.join(', ')}`),
]

const validarPasswordNuevo = body('password')
  .notEmpty().withMessage('Contraseña requerida')
  .matches(PASSWORD_REGEX).withMessage('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo')

const validarPasswordOpcional = body('password')
  .optional({ values: 'falsy' })
  .matches(PASSWORD_REGEX).withMessage('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo')

function validar(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty())
    return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const { rows } = await db.query(`SELECT ${SAFE_FIELDS} FROM usuarios ORDER BY created_at`)
  res.json(rows)
})

router.post('/', requireAuth, requireRole('admin'), [...validarUsuario, validarPasswordNuevo], validar, async (req, res) => {
  const { nombre, apellido, email, password, rol } = req.body

  const hash = await bcrypt.hash(password, 12)
  try {
    const { rows } = await db.query(`
      INSERT INTO usuarios (nombre, apellido, email, password_hash, rol)
      VALUES ($1,$2,$3,$4,$5) RETURNING ${SAFE_FIELDS}
    `, [nombre.trim(), apellido.trim(), email, hash, rol])
    await addAudit({
      accion: 'CREATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_nuevo: { nombre, apellido, email, rol, password: '[REDACTED]' },
    })
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'El email ya está en uso' })
    throw err
  }
})

router.put('/:id',
  requireAuth, requireRole('admin'),
  [param('id').isInt(), ...validarUsuario, validarPasswordOpcional],
  validar,
  async (req, res) => {
    const { nombre, apellido, email, password, rol } = req.body

    const { rows } = password
      ? await db.query(
          `UPDATE usuarios SET nombre=$1,apellido=$2,email=$3,password_hash=$4,rol=$5 WHERE id=$6 RETURNING ${SAFE_FIELDS}`,
          [nombre.trim(), apellido.trim(), email, await bcrypt.hash(password, 12), rol, req.params.id])
      : await db.query(
          `UPDATE usuarios SET nombre=$1,apellido=$2,email=$3,rol=$4 WHERE id=$5 RETURNING ${SAFE_FIELDS}`,
          [nombre.trim(), apellido.trim(), email, rol, req.params.id])

    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' })
    await addAudit({
      accion: 'UPDATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_nuevo: { nombre, apellido, email, rol, password: password ? '[REDACTED]' : undefined },
    })
    res.json(rows[0])
  }
)

router.patch('/:id/toggle',
  requireAuth, requireRole('admin'),
  [param('id').isInt()], validar,
  async (req, res) => {
    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'No puedes desactivar tu propio usuario' })

    const { rows: cur } = await db.query('SELECT activo FROM usuarios WHERE id=$1', [req.params.id])
    if (!cur[0]) return res.status(404).json({ error: 'No encontrado' })

    const nuevoActivo = !cur[0].activo
    const { rows } = await db.query(
      `UPDATE usuarios SET activo=$1 WHERE id=$2 RETURNING ${SAFE_FIELDS}`, [nuevoActivo, req.params.id]
    )
    await addAudit({
      accion: 'UPDATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id,
      datos_antes: { activo: cur[0].activo }, datos_nuevo: { activo: nuevoActivo },
    })
    res.json(rows[0])
  }
)

module.exports = router
