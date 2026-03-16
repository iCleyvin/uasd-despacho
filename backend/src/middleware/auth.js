const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  // Lee token desde cookie httpOnly (preferido) o Authorization header (compatibilidad)
  const token = req.cookies?.uasd_token
    ?? req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null

  if (!token) return res.status(401).json({ error: 'No autorizado' })

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol))
      return res.status(403).json({ error: 'Sin permisos suficientes' })
    next()
  }
}

module.exports = { requireAuth, requireRole }
