const nodemailer = require('nodemailer')

// Si no hay configuración SMTP el mailer está desactivado.
// El reset de contraseña seguirá funcionando (el admin copia el link manualmente).
const SMTP_ENABLED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

let transporter = null
if (SMTP_ENABLED) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  console.log(`[mailer] SMTP configurado → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`)
} else {
  console.log('[mailer] SMTP no configurado — emails desactivados. El admin debe compartir el link manualmente.')
}

/**
 * Envía el link de reset de contraseña al usuario.
 * Retorna true si se envió, false si SMTP no está configurado.
 */
async function sendResetEmail({ nombre, email, resetUrl, expires }) {
  if (!transporter) return false

  const expireText = new Date(expires).toLocaleString('es-DO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  await transporter.sendMail({
    from:    process.env.SMTP_FROM ?? `"UASD Despacho" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: 'Restablecer tu contraseña — UASD Sistema de Despacho',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #334155;">
        <div style="background: #1e3a8a; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #ffffff; font-size: 18px;">Sistema de Despacho — UASD</h1>
        </div>
        <div style="background: #f8fafc; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px;">Hola <strong>${nombre}</strong>,</p>
          <p style="margin: 0 0 20px;">Un administrador ha generado un enlace para restablecer tu contraseña. Haz clic en el botón a continuación:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
            Restablecer contraseña
          </a>
          <p style="margin: 24px 0 8px; font-size: 13px; color: #64748b;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>
          <p style="margin: 0 0 20px; font-size: 12px; color: #64748b; word-break: break-all;">${resetUrl}</p>
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e;">
            ⏰ Este enlace expira el <strong>${expireText}</strong>. Es de un solo uso.
          </div>
          <p style="margin: 20px 0 0; font-size: 12px; color: #94a3b8;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
          </p>
        </div>
      </div>
    `,
  })
  return true
}

module.exports = { sendResetEmail, SMTP_ENABLED }
