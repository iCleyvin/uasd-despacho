jest.mock('../src/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  pool: { end: jest.fn() },
}))

const request = require('supertest')
const jwt     = require('jsonwebtoken')
const app     = require('../src/app')

describe('Middleware de autenticación', () => {
  it('rechaza requests sin cookie a rutas protegidas', async () => {
    const rutas = [
      { method: 'get',  path: '/api/auth/me' },
      { method: 'get',  path: '/api/despachos' },
      { method: 'get',  path: '/api/vehiculos' },
      { method: 'get',  path: '/api/productos' },
      { method: 'get',  path: '/api/usuarios' },
    ]
    for (const { method, path } of rutas) {
      const res = await request(app)[method](path)
      expect(res.status).toBe(401)
    }
  })

  it('rechaza token firmado con secret incorrecto', async () => {
    const tokenInvalido = jwt.sign(
      { id: 1, rol: 'admin', token_version: 1 },
      'wrong-secret'
    )
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `uasd_token=${tokenInvalido}`)

    expect(res.status).toBe(401)
  })
})

describe('Cabeceras de seguridad', () => {
  it('incluye X-Content-Type-Options en todas las respuestas', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
  })

  it('incluye X-Frame-Options', async () => {
    const res = await request(app).get('/api/health')
    // Helmet puede poner DENY o SAMEORIGIN
    expect(res.headers['x-frame-options']).toBeDefined()
  })
})

describe('Rate limiting', () => {
  it('el endpoint /api/health responde correctamente bajo carga normal', async () => {
    const requests = Array.from({ length: 5 }, () =>
      request(app).get('/api/health')
    )
    const results = await Promise.all(requests)
    results.forEach(res => expect(res.status).toBe(200))
  })
})
