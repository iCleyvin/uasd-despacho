// Mock de la BD — el health check hace SELECT 1
jest.mock('../src/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
  pool: { end: jest.fn() },
}))

const request = require('supertest')
const app     = require('../src/app')

describe('GET /api/health', () => {
  it('devuelve status ok y version', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.version).toBeDefined()
    expect(res.body.ts).toBeDefined()
  })

  it('devuelve 503 si la BD no responde', async () => {
    const db = require('../src/db')
    db.query.mockRejectedValueOnce(new Error('connection refused'))

    const res = await request(app).get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body.status).toBe('error')
  })
})
