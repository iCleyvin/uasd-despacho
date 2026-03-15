const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const db     = require('../db')
const { requireAuth } = require('../middleware/auth')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })

  const { rows } = await db.query(
    'SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' })

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' })

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' }
  )

  res.json({
    token,
    user: { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol },
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, apellido, email, rol, activo, created_at FROM usuarios WHERE id = $1', [req.user.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(rows[0])
})

module.exports = router
