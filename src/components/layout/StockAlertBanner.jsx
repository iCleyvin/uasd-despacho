import { useState } from 'react'
import { AlertTriangle, X, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'

export default function StockAlertBanner() {
  const { productos } = useData()
  const { hasRole }   = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Solo visible para admin y supervisor
  if (!hasRole('admin', 'supervisor')) return null
  if (dismissed) return null

  const alertas = productos.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo) && p.activo !== false)
  if (alertas.length === 0) return null

  const criticos = alertas.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo) * 0.5)

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-sm text-amber-800 dark:text-amber-200 flex-1 min-w-0">
        <span className="font-semibold">
          {alertas.length} producto{alertas.length !== 1 ? 's' : ''} bajo stock mínimo
        </span>
        {criticos.length > 0 && (
          <span className="text-red-600 dark:text-red-400 font-semibold">
            {' '}· {criticos.length} crítico{criticos.length !== 1 ? 's' : ''}
          </span>
        )}
        {' — '}
        <span className="text-amber-700 dark:text-amber-300 truncate">
          {alertas.slice(0, 3).map(p => p.nombre).join(', ')}
          {alertas.length > 3 ? ` y ${alertas.length - 3} más` : ''}
        </span>
      </p>
      <Link
        to="/inventario"
        className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 shrink-0 transition-colors"
      >
        Ver inventario <ArrowRight className="w-3 h-3" />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors shrink-0"
        aria-label="Cerrar alerta"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
