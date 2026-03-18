import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Fuel, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import Button from '../components/ui/Button'

export default function ResetPassword() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 max-w-sm w-full text-center">
          <p className="text-red-500 font-medium">Enlace inválido o incompleto.</p>
          <p className="text-slate-500 text-sm mt-2">Solicita un nuevo enlace al administrador.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/login')}>Ir al login</Button>
        </div>
      </div>
    )
  }

  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    if (!PASSWORD_REGEX.test(password))
      return setError('Mínimo 8 caracteres, una mayúscula, un número y un símbolo')

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
    } catch (err) {
      setError(err.message ?? 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-primary-600 px-8 py-8 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Fuel className="w-8 h-8 text-gold-400" />
            </div>
            <h1 className="font-display font-bold text-white text-xl leading-tight">Nueva contraseña</h1>
            <p className="text-blue-200 text-sm mt-1">Sistema de Despacho — UASD</p>
          </div>

          {success ? (
            <div className="px-8 py-10 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">¡Contraseña actualizada!</p>
              <p className="text-sm text-slate-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
                Ir al login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Elige una contraseña segura: mínimo 8 caracteres, una mayúscula, un número y un símbolo.
              </p>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
                Cambiar contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
