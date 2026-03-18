// Variables de entorno mínimas para que la app arranque sin BD real
process.env.DATABASE_URL  = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET    = 'test-secret-32-characters-minimum!!'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN   = 'http://localhost:3001'
process.env.COOKIE_SECURE = 'false'
process.env.NODE_ENV      = 'test'
