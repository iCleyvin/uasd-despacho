import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: es })
}

export function formatDateTime(date) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy HH:mm', { locale: es })
}

export function formatNumber(n, decimals = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-DO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatCurrency(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(n)
}

export const ROL_LABELS = {
  admin:       'Administrador',
  supervisor:  'Supervisor',
  despachador: 'Despachador',
}

export const CATEGORIA_LABELS = {
  combustible:        'Combustible',
  aceite_motor:       'Aceite Motor',
  aceite_transmision: 'Aceite Transmisión',
  repuesto:           'Repuesto',
  otro:               'Otro',
}

// Valida la contraseña con las mismas reglas que el backend:
// mínimo 8 caracteres, al menos 1 mayúscula, 1 número y 1 símbolo.
// Retorna null si es válida, o un string con el mensaje de error.
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

export function validatePassword(password) {
  if (!password || password.length < 8)      return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(password))               return 'Debe incluir al menos una mayúscula'
  if (!/\d/.test(password))                  return 'Debe incluir al menos un número'
  if (!PASSWORD_REGEX.test(password))        return 'Debe incluir al menos un símbolo (!@#$%^&*…)'
  return null
}
