require('dotenv').config()

// ─── Validación de variables de entorno requeridas ────────────────────────────
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN']
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k])
if (missingEnv.length) {
  console.error(`[startup] Variables de entorno faltantes: ${missingEnv.join(', ')}`)
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('[startup] JWT_SECRET debe tener al menos 32 caracteres (256 bits) para ser seguro.')
  process.exit(1)
}

const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit    = require('express-rate-limit')
const morgan       = require('morgan')
const db           = require('./db')

const app = express()

// ─── Trust proxy (nginx en frente) ────────────────────────────────────────────
// Necesario para que express-rate-limit lea X-Forwarded-For correctamente.
app.set('trust proxy', 1)

// ─── Request logging ──────────────────────────────────────────────────────────
// En producción: formato combinado (IP, método, ruta, status, tiempo)
// En desarrollo: formato dev (colores, conciso)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'none'"],
      imgSrc:      ["'none'"],
      connectSrc:  ["'self'"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}))

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false,
  credentials: true,
}))

// ─── Cookie parser ────────────────────────────────────────────────────────────
app.use(cookieParser())

// ─── Body parser (con límite para evitar payloads gigantes) ───────────────────
app.use(express.json({ limit: '1mb' }))

// ─── Rate limiting global ─────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' },
}))

// ─── Rate limiting estricto para login ───────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión, intenta en 15 minutos.' },
}))

// ─── Rate limiting para operaciones de escritura ──────────────────────────────
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas operaciones, intenta más tarde.' },
})
app.use('/api/despachos',    writeLimiter)
app.use('/api/vehiculos',    writeLimiter)
app.use('/api/productos',    writeLimiter)
app.use('/api/dependencias', writeLimiter)
app.use('/api/usuarios',     writeLimiter)

// ─── Health check (verifica conectividad con la BD) ───────────────────────────
const { version } = require('../package.json')

app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', version, ts: new Date() })
  } catch {
    res.status(503).json({ status: 'error', version, ts: new Date() })
  }
})

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'))
app.use('/api/despachos',    require('./routes/despachos'))
app.use('/api/vehiculos',    require('./routes/vehiculos'))
app.use('/api/dependencias', require('./routes/dependencias'))
app.use('/api/productos',    require('./routes/productos'))
app.use('/api/usuarios',     require('./routes/usuarios'))
app.use('/api/auditoria',    require('./routes/auditoria'))
app.use('/api/reportes',     require('./routes/reportes'))

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status ?? 500
  if (status >= 500) {
    // Solo loggear errores internos; no exponer stack al cliente
    console.error(`[${new Date().toISOString()}] ERROR ${status}:`, err.message)
  }
  res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : err.message })
})

// ─── Exportar app para tests ──────────────────────────────────────────────────
module.exports = app

// ─── Arrancar servidor solo si se ejecuta directamente ───────────────────────
if (require.main === module) {
  const PORT = process.env.PORT ?? 3000
  const server = app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`))

  function shutdown(signal) {
    console.log(`[${signal}] Cerrando servidor...`)
    server.close(() => {
      db.pool.end(() => {
        console.log('Conexiones cerradas. Saliendo.')
        process.exit(0)
      })
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}
