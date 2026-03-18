import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Fuel, Package, Truck, Building2,
  BarChart3, ClipboardList, Users, X, ChevronRight, ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard',      permiso: null },
  { to: '/nuevo-despacho', icon: Fuel,            label: 'Nuevo Despacho', permiso: 'despachos.crear' },
  { to: '/despachos',      icon: ClipboardList,   label: 'Historial',      permiso: 'despachos.ver' },
  { to: '/inventario',     icon: Package,         label: 'Inventario',     permiso: 'inventario.ver' },
  { to: '/vehiculos',      icon: Truck,           label: 'Vehículos',      permiso: 'vehiculos.ver' },
  { to: '/dependencias',   icon: Building2,       label: 'Dependencias',   permiso: 'dependencias.ver' },
  { to: '/reportes',       icon: BarChart3,       label: 'Reportes',       permiso: 'reportes.ver' },
  { to: '/auditoria',      icon: ShieldCheck,     label: 'Auditoría',      permiso: 'auditoria.ver' },
  { to: '/usuarios',       icon: Users,           label: 'Usuarios',       adminOnly: true },
]

export default function Sidebar({ open, onClose }) {
  const { hasPermiso, hasRole } = useAuth()

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-4 px-5 py-5 border-b border-slate-700/50">
        <img src="/escudo.png" alt="UASD" className="w-14 h-14 object-contain flex-shrink-0" draggable={false} />
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-base leading-tight">Sistema de Despacho</p>
          <p className="text-slate-400 text-sm mt-0.5 truncate">UASD</p>
        </div>
        {/* Close button on mobile */}
        <button
          onClick={onClose}
          className="ml-auto lg:hidden text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(item => item.adminOnly ? hasRole('admin') : hasPermiso(item.permiso)).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
              isActive
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50',
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">v1.0.0 · UASD © 2026</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar desktop — always visible */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col bg-slate-900 border-r border-slate-700/50">
        {content}
      </aside>

      {/* Sidebar mobile — drawer */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-slate-900 border-r border-slate-700/50 transition-transform duration-300 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        {content}
      </aside>
    </>
  )
}
