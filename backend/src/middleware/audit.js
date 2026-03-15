const db = require('../db')

async function addAudit({ accion, tabla, registro_id, usuario_id, datos_antes = null, datos_nuevo = null }) {
  await db.query(
    `INSERT INTO auditoria (accion, tabla, registro_id, usuario_id, datos_antes, datos_nuevo)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [accion, tabla, registro_id, usuario_id ?? null,
     datos_antes ? JSON.stringify(datos_antes) : null,
     datos_nuevo  ? JSON.stringify(datos_nuevo)  : null]
  )
}

module.exports = { addAudit }
