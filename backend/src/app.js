require('dotenv').config()
const express      = require('express')
const cors         = require('cors')
const helmet       = require('helmet')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')

const app = express()

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet())

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

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

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

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`))
