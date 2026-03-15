require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

// Routes
app.use('/api/auth',        require('./routes/auth'))
app.use('/api/despachos',   require('./routes/despachos'))
app.use('/api/vehiculos',   require('./routes/vehiculos'))
app.use('/api/dependencias', require('./routes/dependencias'))
app.use('/api/productos',   require('./routes/productos'))
app.use('/api/usuarios',    require('./routes/usuarios'))
app.use('/api/auditoria',   require('./routes/auditoria'))
app.use('/api/reportes',    require('./routes/reportes'))

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`API corriendo en puerto ${PORT}`))
