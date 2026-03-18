const { Pool } = require('pg')

const pool = new Pool({
  connectionString:      process.env.DATABASE_URL,
  ssl:                   process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:                   20,   // máximo de conexiones concurrentes
  idleTimeoutMillis:     30000, // cerrar conexión inactiva tras 30s
  connectionTimeoutMillis: 5000, // fallar si no hay conexión disponible en 5s
})

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err)
})

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
}
