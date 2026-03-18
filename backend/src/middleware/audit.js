const db = require('../db')

// client opcional: si se pasa, el audit corre dentro de la transacción abierta
async function addAudit({ accion, tabla, registro_id, usuario_id, datos_antes = null, datos_nuevo = null, client = null }) {
  const runner = client ?? db
  await runner.query(
    `INSERT INTO auditoria (accion, tabla, registro_id, usuario_id, datos_antes, datos_nuevo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [accion, tabla, registro_id, usuario_id ?? null,
     datos_antes ? JSON.stringify(datos_antes) : null,
     datos_nuevo  ? JSON.stringify(datos_nuevo)  : null]
  )
}

module.exports = { addAudit }
