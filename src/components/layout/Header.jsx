import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, AlertTriangle, X } from 'lucide-react'
import UserMenu from './UserMenu'
import { useData } from '../../context/DataContext'

export default function Header({ onMenuClick }) {
  const { productos } = useData()
  const lowStock = productos.filter(p => p.activo && Number(p.stock_actual) <= Number(p.stock_minimo))
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-slate-400">Universidad Autónoma de Santo Domingo</p>
          <p className="text-sm font-semibold text-primary-600 dark:text-blue-400 font-display leading-none">
            Sistema de Despacho
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Bell + dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {lowStock.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-11 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
              {/* Header del panel */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notificaciones</span>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido */}
              {lowStock.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  Sin alertas de stock
                </div>
              ) : (
                <div>
                  <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {lowStock.length} producto{lowStock.length > 1 ? 's' : ''} con stock bajo
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                    {lowStock.map(p => (
                      <li key={p.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.nombre}</p>
                        <p className="text-xs text-red-500 mt-0.5">
                          Stock: {Number(p.stock_actual).toFixed(0)} {p.unidad}
                          <span className="text-slate-400 ml-1">(mín. {Number(p.stock_minimo).toFixed(0)})</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
        <UserMenu />
      </div>
    </header>
  )
}
