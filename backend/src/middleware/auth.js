const jwt = require('jsonwebtoken')
const db  = require('../db')

async function requireAuth(req, res, next) {
  // Lee token desde cookie httpOnly (preferido) o Authorization header (compatibilidad)
  const token = req.cookies?.uasd_token
    ?? (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null)

  if (!token) return res.status(401).json({ error: 'No autorizado' })

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }

  try {
    const { rows } = await db.query('SELECT activo, token_version, permisos FROM usuarios WHERE id = $1', [decoded.id])
    const dbUser = rows[0]
    if (!dbUser || !dbUser.activo)
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' })
    if ((dbUser.token_version ?? 1) !== (decoded.token_version ?? 1))
      return res.status(401).json({ error: 'Sesión invalidada. Por favor inicia sesión nuevamente.' })
    req.user = { ...decoded, permisos: dbUser.permisos ?? [] }
    next()
  } catch (err) {
    console.error('[requireAuth]', err.message)
    return res.status(500).json({ error: 'Error de autenticación' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol))
      return res.status(403).json({ error: 'Sin permisos suficientes' })
    next()
  }
}

// Comprueba un permiso granular. Admin siempre pasa.
function requirePermiso(permiso) {
  return (req, res, next) => {
    if (req.user?.rol === 'admin') return next()
    if (!(req.user?.permisos ?? []).includes(permiso))
      return res.status(403).json({ error: `No tienes permiso para esta acción (${permiso})` })
    next()
  }
}

module.exports = { requireAuth, requireRole, requirePermiso }
