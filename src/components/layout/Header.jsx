import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, AlertTriangle, X, Circle, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import UserMenu from './UserMenu'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'

const ROL_LABEL = { admin: 'Admin', supervisor: 'Supervisor', despachador: 'Despachador' }

export default function Header({ onMenuClick }) {
  const { productos } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const lowStock = productos.filter(p => p.activo && Number(p.stock_actual) <= Number(p.stock_minimo))
  const [open, setOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [kicking, setKicking] = useState(null) // id del usuario siendo desconectado
  const ref = useRef(null)

  const canSeeOnline = user?.rol === 'admin' || user?.rol === 'supervisor'
  const isAdmin = user?.rol === 'admin'

  const fetchOnline = () => api.get('/usuarios/online').then(setOnlineUsers).catch(() => {})

  useEffect(() => {
    if (!open || !canSeeOnline) return
    fetchOnline()
    const id = setInterval(fetchOnline, 30_000)
    return () => clearInterval(id)
  }, [open, canSeeOnline])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function goTo(path) {
    setOpen(false)
    navigate(path)
  }

  async function forceLogout(u) {
    if (!window.confirm(`¿Cerrar la sesión de ${u.nombre} ${u.apellido}?`)) return
    setKicking(u.id)
    try {
      await api.post(`/auth/invalidate-sessions/${u.id}`)
      setOnlineUsers(prev => prev.filter(x => x.id !== u.id))
    } catch { /* silent */ }
    finally { setKicking(null) }
  }

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
              {/* Título */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Notificaciones</span>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Stock bajo ─────────────────────────────────────────── */}
              {lowStock.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-slate-400">
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
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                    {lowStock.map(p => (
                      <li key={p.id}>
                        <button
                          onClick={() => goTo('/inventario')}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{p.nombre}</p>
                          <p className="text-xs text-red-500 mt-0.5">
                            Stock: {Number(p.stock_actual).toFixed(0)} {p.unidad}
                            <span className="text-slate-400 ml-1">(mín. {Number(p.stock_minimo).toFixed(0)})</span>
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Usuarios en línea ───────────────────────────────────── */}
              {canSeeOnline && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => goTo('/usuarios')}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Circle className="w-2 h-2 fill-green-500 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Usuarios en línea ({onlineUsers.length})
                    </span>
                  </button>
                  {onlineUsers.length === 0 ? (
                    <p className="px-4 pb-3 text-xs text-slate-400">Nadie más conectado</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-40 overflow-y-auto">
                      {onlineUsers.map(u => (
                        <li key={u.id} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <button
                            onClick={() => goTo('/usuarios')}
                            className="flex-1 min-w-0 text-left"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {u.nombre} {u.apellido}
                            </p>
                            <p className="text-xs text-slate-400">{ROL_LABEL[u.rol] ?? u.rol}</p>
                          </button>
                          {isAdmin && u.id !== user.id && (
                            <button
                              onClick={() => forceLogout(u)}
                              disabled={kicking === u.id}
                              title="Cerrar sesión forzado"
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0 disabled:opacity-50"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
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
