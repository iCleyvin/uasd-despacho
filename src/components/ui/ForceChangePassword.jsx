import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../lib/api'
import Modal from './Modal'
import Input from './Input'
import Button from './Button'

export default function ForceChangePassword() {
  const { user, refreshUser } = useAuth()
  const [form,    setForm]    = useState({ nueva: '', confirmar: '' })
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  if (!user?.must_change_password) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.nueva !== form.confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { actual: null, nueva: form.nueva, force: true })
      await refreshUser()
    } catch (err) {
      setError(err.message ?? 'Error al cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Debes cambiar tu contraseña" size="sm">
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-0.5">Contraseña temporal detectada</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Tu cuenta fue creada con una contraseña temporal. Debes establecer una contraseña personal antes de continuar.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nueva contraseña *"
            type="password"
            placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
            value={form.nueva}
            onChange={e => { setForm(f => ({ ...f, nueva: e.target.value })); setError('') }}
            autoFocus
          />
          <Input
            label="Confirmar contraseña *"
            type="password"
            placeholder="Repite la contraseña"
            value={form.confirmar}
            onChange={e => { setForm(f => ({ ...f, confirmar: e.target.value })); setError('') }}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">⚠ {error}</p>
          )}
          <Button type="submit" variant="primary" className="w-full" loading={saving}>
            Establecer contraseña
          </Button>
        </form>
      </div>
    </Modal>
  )
}
