import { useState } from 'react'
import { Menu, Bell, AlertTriangle } from 'lucide-react'
import UserMenu from './UserMenu'
import { PRODUCTOS } from '../../utils/mockData'

export default function Header({ onMenuClick }) {
  const lowStock = PRODUCTOS.filter(p => p.stock_actual <= p.stock_minimo)

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      {/* Left: hamburger + breadcrumb area */}
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

      {/* Right: alerts + user */}
      <div className="flex items-center gap-2">
        {/* Stock alerts bell */}
        <div className="relative">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            {lowStock.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {/* Low stock banner */}
        {lowStock.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              {lowStock.length} producto{lowStock.length > 1 ? 's' : ''} con stock bajo
            </span>
          </div>
        )}

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

        <UserMenu />
      </div>
    </header>
  )
}
