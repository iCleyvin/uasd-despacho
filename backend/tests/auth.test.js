const bcrypt = require('bcryptjs')

// Mock BD — se configura por test
const mockQuery = jest.fn()
jest.mock('../src/db', () => ({
  query: (...args) => mockQuery(...args),
  pool: { end: jest.fn() },
}))

const request = require('supertest')
const app     = require('../src/app')

// Hash de 'Admin@2026' precalculado para no esperar bcrypt en cada test
let PASSWORD_HASH
beforeAll(async () => {
  PASSWORD_HASH = await bcrypt.hash('Admin@2026', 12)
})

beforeEach(() => {
  mockQuery.mockReset()
})

// ─── Login ────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('rechaza si faltan credenciales', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requeridos/i)
  })

  it('rechaza credenciales incorrectas (usuario no existe)', async () => {
    // BD devuelve 0 filas
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@uasd.edu.do', password: 'Admin@2026' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/inválidas/i)
  })

  it('rechaza contraseña incorrecta', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'admin@uasd.edu.do', password_hash: PASSWORD_HASH, rol: 'admin', activo: true, nombre: 'Admin', apellido: 'Test', permisos: [], token_version: 1 }],
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@uasd.edu.do', password: 'WrongPass@1' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/inválidas/i)
  })

  it('devuelve usuario y cookie con credenciales correctas', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@uasd.edu.do', password_hash: PASSWORD_HASH, rol: 'admin', activo: true, nombre: 'Admin', apellido: 'Test', permisos: [], token_version: 1 }],
      })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE last_seen

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@uasd.edu.do', password: 'Admin@2026' })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('admin@uasd.edu.do')
    expect(res.body.user.rol).toBe('admin')
    // Verifica que la cookie HttpOnly fue enviada
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
    expect(cookies[0]).toMatch(/uasd_token/)
    expect(cookies[0]).toMatch(/HttpOnly/i)
  })
})

// ─── Logout ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  it('limpia la cookie y devuelve ok', async () => {
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // La cookie debe ser cleared (Max-Age=0 o expires pasado)
    const cookies = res.headers['set-cookie']
    if (cookies) {
      expect(cookies[0]).toMatch(/uasd_token/)
    }
  })
})

// ─── /me sin autenticación ────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('devuelve 401 sin cookie de sesión', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

// ─── Reset password — validación ──────────────────────────────────────────────
describe('POST /api/auth/reset-password', () => {
  it('rechaza si faltan campos', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'abc' }) // falta password

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requeridos/i)
  })

  it('rechaza contraseña que no cumple la política', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'abc123', password: 'debil' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/contraseña/i)
  })

  it('rechaza token inválido o expirado', async () => {
    // BD devuelve 0 filas (token no existe o expiró)
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'tokeninvalido123', password: 'Valid@1234' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/inválido|expirado/i)
  })
})
