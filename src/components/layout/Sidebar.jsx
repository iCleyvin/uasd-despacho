import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Fuel, Package, Truck, Building2,
  BarChart3, ClipboardList, Users, X, ChevronRight, ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',      roles: ['admin', 'supervisor', 'despachador'] },
  { to: '/nuevo-despacho',  icon: Fuel,            label: 'Nuevo Despacho', roles: ['admin', 'supervisor', 'despachador'] },
  { to: '/despachos',       icon: ClipboardList,   label: 'Historial',      roles: ['admin', 'supervisor', 'despachador'] },
  { to: '/inventario',      icon: Package,         label: 'Inventario',     roles: ['admin', 'supervisor'] },
  { to: '/vehiculos',       icon: Truck,           label: 'Vehículos',      roles: ['admin', 'supervisor'] },
  { to: '/dependencias',    icon: Building2,       label: 'Dependencias',   roles: ['admin', 'supervisor'] },
  { to: '/reportes',        icon: BarChart3,       label: 'Reportes',       roles: ['admin', 'supervisor'] },
  { to: '/auditoria',       icon: ShieldCheck,     label: 'Auditoría',      roles: ['admin', 'supervisor'] },
  { to: '/usuarios',        icon: Users,           label: 'Usuarios',       roles: ['admin'] },
]

export default function Sidebar({ open, onClose }) {
  const { hasRole } = useAuth()

  const content = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center flex-shrink-0">
          <span className="font-display font-bold text-white text-sm">U</span>
        </div>
        <div className="min-w-0">
          <p className="font-display font-bold text-white text-sm leading-none">UASD</p>
          <p className="text-slate-400 text-xs mt-0.5 truncate">Sistema de Despacho</p>
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
        {NAV_ITEMS.filter(item => hasRole(...item.roles)).map(({ to, icon: Icon, label }) => (
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
