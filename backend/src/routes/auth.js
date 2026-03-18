const router    = require('express').Router()
const bcrypt    = require('bcryptjs')
const crypto    = require('crypto')
const jwt       = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const db        = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')
const { addAudit } = require('../middleware/audit')

// Rate limit estricto para endpoints de reset de contraseña
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta en 1 hora.' },
})

const COOKIE_NAME = 'uasd_token'
const COOKIE_OPTS = {
  httpOnly: true,
  // COOKIE_SECURE=true solo cuando se sirve por HTTPS (no activar en HTTP aunque sea producción)
  secure:   process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict',
  maxAge:   8 * 60 * 60 * 1000, // 8 horas en ms
  path:     '/',
}

// Política de contraseñas
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/

router.post('/login', async (req, res) => {
  try {
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

    const payload = { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol, token_version: user.token_version ?? 1 }
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' })

    await db.query('UPDATE usuarios SET last_seen = NOW() WHERE id = $1', [user.id])
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS)
    res.json({ user: { ...payload, permisos: user.permisos ?? [] } })
  } catch (err) {
    console.error('[auth/login]', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nombre, apellido, email, rol, activo, created_at, permisos FROM usuarios WHERE id = $1', [req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json({ ...rows[0], permisos: rows[0].permisos ?? [] })
  } catch (err) {
    console.error('[auth/me]', err.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ── Heartbeat de presencia ─────────────────────────────────────────────────────
router.post('/ping', requireAuth, async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET last_seen = NOW() WHERE id = $1', [req.user.id])
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

// ── Generar token de reset (solo admin) ────────────────────────────────────────
// Devuelve el token en texto plano UNA sola vez para que el admin lo comparta con el usuario.
router.post('/generate-reset-token/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params
    if (Number(userId) === req.user.id)
      return res.status(400).json({ error: 'No puedes generar un reset para tu propio usuario' })

    const { rows } = await db.query(
      'SELECT id, nombre, apellido, email FROM usuarios WHERE id = $1 AND activo = true', [userId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado o inactivo' })

    // Generar token aleatorio y guardar solo su hash en la BD
    const token     = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expires   = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await db.query(
      'UPDATE usuarios SET reset_token_hash=$1, reset_token_expires=$2 WHERE id=$3',
      [tokenHash, expires, userId]
    )

    await addAudit({
      accion: 'RESET_TOKEN', tabla: 'usuarios', registro_id: rows[0].id,
      usuario_id: req.user.id,
      datos_nuevo: { accion: 'token_generado', target_email: rows[0].email, expires: expires.toISOString() },
    })

    // Devolver el token en texto plano — el admin debe compartirlo con el usuario
    res.json({
      token,
      usuario: `${rows[0].nombre} ${rows[0].apellido}`,
      email: rows[0].email,
      expires: expires.toISOString(),
    })
  } catch (err) {
    console.error('[auth/generate-reset-token]', err.message)
    res.status(500).json({ error: 'Error al generar token de reset' })
  }
})

// ── Aplicar reset de contraseña (público, solo requiere token válido) ──────────
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password)
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' })

    if (!PASSWORD_REGEX.test(password))
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo' })

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const { rows } = await db.query(
      `SELECT id, email, nombre FROM usuarios
       WHERE reset_token_hash = $1
         AND reset_token_expires > NOW()
         AND activo = true`,
      [tokenHash]
    )
    if (!rows[0]) return res.status(400).json({ error: 'Token inválido o expirado' })

    const newHash = await bcrypt.hash(password, 12)

    await db.query(
      `UPDATE usuarios SET password_hash=$1, reset_token_hash=NULL, reset_token_expires=NULL,
       token_version = COALESCE(token_version, 1) + 1 WHERE id=$2`,
      [newHash, rows[0].id]
    )

    await addAudit({
      accion: 'RESET_PASSWORD', tabla: 'usuarios', registro_id: rows[0].id,
      usuario_id: rows[0].id,
      datos_nuevo: { accion: 'contraseña_cambiada_via_token' },
    })

    res.json({ ok: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
  } catch (err) {
    console.error('[auth/reset-password]', err.message)
    res.status(500).json({ error: 'Error al resetear contraseña' })
  }
})

// ── Cambiar contraseña propia (usuario autenticado) ────────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { actual, nueva } = req.body
    if (!actual || !nueva)
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
    if (!PASSWORD_REGEX.test(nueva))
      return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo' })

    const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1 AND activo = true', [req.user.id])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    const ok = await bcrypt.compare(actual, user.password_hash)
    if (!ok) return res.status(400).json({ error: 'Contraseña actual incorrecta' })

    const newHash = await bcrypt.hash(nueva, 12)
    const { rows: updated } = await db.query(
      `UPDATE usuarios SET password_hash=$1, token_version = COALESCE(token_version, 1) + 1
       WHERE id=$2 RETURNING token_version`,
      [newHash, req.user.id]
    )

    // Re-emitir cookie con nueva token_version para que la sesión actual siga activa
    const payload = { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol, token_version: updated[0].token_version }
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' })
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS)

    await addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: user.id, usuario_id: req.user.id, datos_nuevo: { accion: 'cambio_contraseña_propia' } })
    res.json({ ok: true, message: 'Contraseña actualizada.' })
  } catch (err) {
    console.error('[auth/change-password]', err.message)
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
})

// ── Cerrar todas las sesiones propias ─────────────────────────────────────────
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await db.query(
      'UPDATE usuarios SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1',
      [req.user.id]
    )
    res.clearCookie(COOKIE_NAME, { path: '/' })
    await addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: req.user.id, usuario_id: req.user.id, datos_nuevo: { accion: 'logout_all_sessions' } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[auth/logout-all]', err.message)
    res.status(500).json({ error: 'Error al invalidar sesiones' })
  }
})

// ── Invalidar sesiones de otro usuario (solo admin) ────────────────────────────
router.post('/invalidate-sessions/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params
    const { rows } = await db.query('SELECT id, nombre, apellido FROM usuarios WHERE id = $1 AND activo = true', [userId])
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado o inactivo' })

    await db.query(
      'UPDATE usuarios SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1',
      [userId]
    )
    await addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: rows[0].id, usuario_id: req.user.id, datos_nuevo: { accion: 'invalidar_sesiones_usuario', target: `${rows[0].nombre} ${rows[0].apellido}` } })
    res.json({ ok: true })
  } catch (err) {
    console.error('[auth/invalidate-sessions]', err.message)
    res.status(500).json({ error: 'Error al invalidar sesiones' })
  }
})

module.exports = router
