import { useState, useRef, useEffect } from 'react'
import { LogOut, Moon, Sun, KeyRound, ChevronDown, ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { api } from '../../lib/api'
import { ROL_LABELS } from '../../utils/format'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import clsx from 'clsx'

function ChangePasswordModal({ open, onClose }) {
  const [form, setForm]     = useState({ actual: '', nueva: '', confirmar: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const e = {}
    if (!form.actual)            e.actual    = 'Requerido'
    if (form.nueva.length < 8)   e.nueva     = 'Mínimo 8 caracteres'
    if (!/[A-Z]/.test(form.nueva)) e.nueva   = 'Debe tener al menos una mayúscula'
    if (!/[0-9]/.test(form.nueva)) e.nueva   = 'Debe tener al menos un número'
    if (form.nueva !== form.confirmar) e.confirmar = 'Las contraseñas no coinciden'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { actual: form.actual, nueva: form.nueva })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose(); setForm({ actual: '', nueva: '', confirmar: '' }) }, 1500)
    } catch (err) {
      setErrors({ actual: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cambiar contraseña">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input label="Contraseña actual" type="password" value={form.actual}    onChange={e => setForm(f => ({...f, actual: e.target.value}))}    error={errors.actual}    placeholder="••••••••" />
        <Input label="Nueva contraseña"  type="password" value={form.nueva}     onChange={e => setForm(f => ({...f, nueva: e.target.value}))}     error={errors.nueva}     placeholder="••••••••" />
        <Input label="Confirmar"          type="password" value={form.confirmar} onChange={e => setForm(f => ({...f, confirmar: e.target.value}))} error={errors.confirmar} placeholder="••••••••" />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>
            {success ? '¡Guardado!' : 'Cambiar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UserMenu() {
  const { user, logout }     = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate               = useNavigate()
  const [open, setOpen]        = useState(false)
  const [showPwModal,  setShowPwModal]  = useState(false)
  const [logoutAllBusy, setLogoutAllBusy] = useState(false)
  const ref = useRef(null)

  const initials = [user?.nombre?.[0], user?.apellido?.[0]].filter(Boolean).join('').toUpperCase()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function handleLogoutAll() {
    setLogoutAllBusy(true)
    try {
      await api.post('/auth/logout-all')
    } catch { /* silent */ }
    logout()
    navigate('/login')
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 border-2 border-gold-500 flex items-center justify-center text-white text-xs font-bold font-display">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-none">
              {user?.nombre} {user?.apellido}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{ROL_LABELS[user?.rol]}</p>
          </div>
          <ChevronDown className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.nombre} {user?.apellido}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs bg-primary-600/10 text-primary-600 dark:text-blue-400 font-medium">
                {ROL_LABELS[user?.rol]}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => { toggleTheme(); setOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-slate-400" />
                : <Moon className="w-4 h-4 text-slate-400" />}
              <span className="flex-1 text-left">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
              <div className={clsx('w-9 h-5 rounded-full transition-colors relative', theme === 'dark' ? 'bg-primary-600' : 'bg-slate-200')}>
                <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
            </button>

            {/* Change password */}
            <button
              onClick={() => { setShowPwModal(true); setOpen(false) }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              Cambiar contraseña
            </button>

            {/* Invalidar todas las sesiones */}
            <button
              onClick={() => { setOpen(false); handleLogoutAll() }}
              disabled={logoutAllBusy}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            >
              <ShieldOff className="w-4 h-4 text-slate-400" />
              Cerrar todas las sesiones
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <ChangePasswordModal open={showPwModal} onClose={() => setShowPwModal(false)} />
    </>
  )
}
