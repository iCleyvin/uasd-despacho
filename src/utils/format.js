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
