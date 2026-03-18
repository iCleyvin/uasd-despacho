const router = require('express').Router()
const { query, validationResult } = require('express-validator')
const db     = require('../db')
const { requireAuth, requireRole, requirePermiso } = require('../middleware/auth')

function validar(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg })
  next()
}

const TABLAS_VALIDAS   = ['despachos', 'productos', 'vehiculos', 'dependencias', 'usuarios']
const ACCIONES_VALIDAS = ['CREATE', 'UPDATE', 'DELETE', 'ENTRADA']

const validarFiltros = [
  query('tabla').optional().trim().isIn(TABLAS_VALIDAS).withMessage('Tabla inválida'),
  query('accion').optional().trim().isIn(ACCIONES_VALIDAS).withMessage('Acción inválida'),
  query('usuario_id').optional().isInt({ min: 1 }),
  query('fecha_desde').optional().isISO8601().withMessage('fecha_desde inválida'),
  query('fecha_hasta').optional().isISO8601().withMessage('fecha_hasta inválida'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
]

function buildWhere(q) {
  const conditions = []
  const params = []
  if (q.tabla)      { params.push(q.tabla);      conditions.push(`a.tabla      = $${params.length}`) }
  if (q.accion)     { params.push(q.accion);     conditions.push(`a.accion     = $${params.length}`) }
  if (q.usuario_id) { params.push(q.usuario_id); conditions.push(`a.usuario_id = $${params.length}`) }
  if (q.fecha_desde){ params.push(q.fecha_desde);                 conditions.push(`a.created_at >= $${params.length}`) }
  if (q.fecha_hasta){ params.push(q.fecha_hasta + 'T23:59:59');   conditions.push(`a.created_at <= $${params.length}`) }
  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params }
}

router.get('/', requireAuth, requirePermiso('auditoria.ver'), validarFiltros, validar, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    const { where, params } = buildWhere(req.query)

    const [{ rows }, countResult] = await Promise.all([
      db.query(`
        SELECT a.*, u.nombre || ' ' || u.apellido as usuario_nombre
        FROM auditoria a
        LEFT JOIN usuarios u ON u.id = a.usuario_id
        ${where}
        ORDER BY a.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
      db.query(`SELECT COUNT(*) FROM auditoria a ${where}`, params),
    ])

    res.json({ data: rows, total: Number(countResult.rows[0].count) })
  } catch (err) {
    console.error('[auditoria GET /]', err.message)
    res.status(500).json({ error: 'Error al obtener auditoría' })
  }
})

// GET /api/auditoria/export — descarga CSV
router.get('/export', requireAuth, requirePermiso('auditoria.ver'), validarFiltros, validar, async (req, res) => {
  try {
    const { where, params } = buildWhere(req.query)
    const { rows } = await db.query(`
      SELECT a.*, u.nombre || ' ' || u.apellido as usuario_nombre
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      ${where}
      ORDER BY a.created_at DESC
    `, params)

    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const headers = ['ID', 'Fecha', 'Usuario', 'Accion', 'Tabla', 'Registro ID', 'Datos antes', 'Datos nuevos']
    const lines = [
      headers.join(','),
      ...rows.map(a => [
        a.id,
        a.created_at ? new Date(a.created_at).toLocaleString('es-DO') : '',
        a.usuario_nombre,
        a.accion,
        a.tabla,
        a.registro_id,
        a.datos_antes ? JSON.stringify(a.datos_antes) : '',
        a.datos_nuevo ? JSON.stringify(a.datos_nuevo) : '',
      ].map(esc).join(',')),
    ]

    const fecha = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_${fecha}.csv"`)
    res.send('\uFEFF' + lines.join('\r\n'))
  } catch (err) {
    console.error('[auditoria GET /export]', err.message)
    res.status(500).json({ error: 'Error al exportar auditoría' })
  }
})

// POST /api/auditoria/cleanup — eliminar registros antiguos (admin)
router.post("/cleanup", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const meses = Math.max(1, Math.min(60, parseInt(req.body.meses ?? "6", 10) || 6))
    const { rows } = await db.query(
      `DELETE FROM auditoria WHERE created_at < NOW() - make_interval(months => $1)
       RETURNING id`, [meses]
    )
    console.log(`[auditoria cleanup] ${rows.length} registros eliminados (>${ meses} meses)`)
    res.json({ eliminados: rows.length, meses })
  } catch (err) {
    console.error("[auditoria POST /cleanup]", err.message)
    res.status(500).json({ error: "Error al limpiar auditoría" })
  }
})

module.exports = router
