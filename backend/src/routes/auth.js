const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const db     = require('../db')
const { requireAuth } = require('../middleware/auth')

const COOKIE_NAME = 'uasd_token'
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   8 * 60 * 60 * 1000, // 8 horas en ms
  path:     '/',
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' })

  const { rows } = await db.query(
    'SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email.toLowerCase().trim()]
  )
  const user = rows[0]

  // Comparación constante para evitar timing attacks (siempre ejecuta bcrypt)
  const hash = user?.password_hash ?? '$2a$12$invalidhashtopreventtimingattack000000000000000000000'
  const ok   = await bcrypt.compare(password, hash)

  if (!user || !ok)
    return res.status(401).json({ error: 'Credenciales inválidas' })

  const payload = { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol }
  const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' })

  res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
  res.json({ user: payload })
})

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, apellido, email, rol, activo, created_at FROM usuarios WHERE id = $1', [req.user.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(rows[0])
})

module.exports = router
