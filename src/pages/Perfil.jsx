import { useState, useEffect, useRef } from 'react'
import { Camera, Edit2, Save, X, KeyRound, ShieldOff, Calendar, Mail, Shield, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { AVATAR_PRESETS, initials } from '../utils/avatar'
import { formatDate, validatePassword, ROL_LABELS } from '../utils/format'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useNavigate } from 'react-router-dom'

const ROL_BADGE = { admin: 'danger', supervisor: 'gold', despachador: 'info' }

// ── Avatar selector ────────────────────────────────────────────────────────────
function AvatarSection({ user, onUpdate }) {
  const [preview, setPreview]     = useState(null)   // base64 of uploaded image
  const [saving, setSaving]       = useState(false)
  const [selected, setSelected]   = useState(user.avatar_preset ?? null)
  const fileRef                    = useRef(null)
  const { showToast }              = useToast()

  const currentUrl   = preview ?? user.avatar_url ?? null
  const displayInit  = initials(user)

  // Color of active avatar circle
  const activePreset = AVATAR_PRESETS.find(p => p.id === selected)

  async function applyPreset(id) {
    setSelected(id)
    setPreview(null)
    setSaving(true)
    try {
      const updated = await api.patch('/auth/avatar', { type: 'preset', value: id })
      onUpdate(updated)
      showToast('Avatar actualizado', 'success')
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally { setSaving(false) }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', 'error'); return }

    // Resize to max 200x200 using canvas
    const bitmap = await createImageBitmap(file)
    const size   = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 200
    const ctx = canvas.getContext('2d')
    const sx = (bitmap.width  - size) / 2
    const sy = (bitmap.height - size) / 2
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 200, 200)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)

    setPreview(dataUrl)
    setSelected(null)
    setSaving(true)
    try {
      const updated = await api.patch('/auth/avatar', { type: 'upload', value: dataUrl })
      onUpdate(updated)
      showToast('Foto de perfil actualizada', 'success')
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
      setPreview(null)
    } finally { setSaving(false) }
  }

  async function handleReset() {
    setSelected(null)
    setPreview(null)
    setSaving(true)
    try {
      const updated = await api.patch('/auth/avatar', { type: 'reset' })
      onUpdate(updated)
      showToast('Avatar restablecido', 'success')
    } catch (err) {
      showToast(err.message ?? 'Error', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Avatar</span>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Current avatar preview */}
          <div className="relative shrink-0">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold font-display overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg${!activePreset && !currentUrl ? ' bg-primary-600 text-white' : ''}`}
              style={
                currentUrl
                  ? {}
                  : activePreset
                    ? { backgroundColor: activePreset.bg, color: activePreset.text }
                    : {}
              }
            >
              {currentUrl
                ? <img src={currentUrl} alt={displayInit} className="w-full h-full object-cover" />
                : displayInit
              }
            </div>
            {saving && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-md transition-colors"
              title="Subir foto"
              disabled={saving}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Preset grid */}
          <div className="flex-1 w-full">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Colores prediseñados
            </p>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_PRESETS.map(p => (
                <button
                  key={p.id}
                  title={p.label}
                  disabled={saving}
                  onClick={() => applyPreset(p.id)}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-display transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: p.bg, color: p.text }}
                >
                  {displayInit}
                  {selected === p.id && !currentUrl && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-offset-2 ring-white dark:ring-slate-800" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="secondary"
                size="sm"
                icon={<Camera className="w-3.5 h-3.5" />}
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                Subir foto
              </Button>
              {(user.avatar_preset || user.avatar_url) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={saving}
                >
                  Restablecer
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              La foto se recorta y redimensiona a 200×200 px automáticamente.
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ── Datos personales ───────────────────────────────────────────────────────────
function DatosSection({ user, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ nombre: user.nombre, apellido: user.apellido })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const { showToast }         = useToast()

  async function handleSave() {
    if (!form.nombre.trim() || !form.apellido.trim()) { setError('Nombre y apellido son requeridos'); return }
    setSaving(true)
    try {
      const updated = await api.patch('/auth/profile', form)
      onUpdate(updated)
      setEditing(false)
      showToast('Datos actualizados', 'success')
    } catch (err) {
      setError(err.message ?? 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Datos personales</span>
          {!editing
            ? <Button variant="secondary" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => { setEditing(true); setError('') }}>Editar</Button>
            : <Button variant="secondary" size="sm" icon={<X className="w-3.5 h-3.5" />} onClick={() => { setEditing(false); setForm({ nombre: user.nombre, apellido: user.apellido }); setError('') }}>Cancelar</Button>
          }
        </div>
      </CardHeader>
      <CardBody>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nombre" value={form.nombre} onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setError('') }} autoFocus />
              <Input label="Apellido" value={form.apellido} onChange={e => { setForm(f => ({ ...f, apellido: e.target.value })); setError('') }} />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">⚠ {error}</p>}
            <Button variant="primary" icon={<Save className="w-4 h-4" />} loading={saving} onClick={handleSave}>
              Guardar cambios
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Nombre completo</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{user.nombre} {user.apellido}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Correo electrónico</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Rol</p>
                <Badge variant={ROL_BADGE[user.rol] ?? 'neutral'}>{ROL_LABELS[user.rol] ?? user.rol}</Badge>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Miembro desde</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ── Seguridad ──────────────────────────────────────────────────────────────────
function SeguridadSection() {
  const { logout } = useAuth()
  const navigate   = useNavigate()
  const { showToast } = useToast()

  const [showPw, setShowPw]         = useState(false)
  const [pwForm, setPwForm]         = useState({ actual: '', nueva: '', confirmar: '' })
  const [pwErrors, setPwErrors]     = useState({})
  const [pwSaving, setPwSaving]     = useState(false)
  const [pwSuccess, setPwSuccess]   = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  function validatePw() {
    const e = {}
    if (!pwForm.actual) e.actual = 'Requerido'
    const err = validatePassword(pwForm.nueva)
    if (err) e.nueva = err
    if (pwForm.nueva !== pwForm.confirmar) e.confirmar = 'Las contraseñas no coinciden'
    return e
  }

  async function handleChangePw(ev) {
    ev.preventDefault()
    const errs = validatePw()
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', { actual: pwForm.actual, nueva: pwForm.nueva })
      setPwSuccess(true)
      setPwForm({ actual: '', nueva: '', confirmar: '' })
      setTimeout(() => { setPwSuccess(false); setShowPw(false) }, 1800)
      showToast('Contraseña actualizada', 'success')
    } catch (err) {
      setPwErrors({ actual: err.message })
    } finally { setPwSaving(false) }
  }

  async function handleLogoutAll() {
    setLogoutBusy(true)
    try {
      await api.post('/auth/logout-all')
    } catch { /* silent */ }
    logout()
    navigate('/login')
  }

  return (
    <Card>
      <CardHeader>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Seguridad</span>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          {/* Change password */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => { setShowPw(v => !v); setPwErrors({}); setPwSuccess(false) }}
              className="flex items-center justify-between w-full px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Cambiar contraseña</p>
                  <p className="text-xs text-slate-400">Actualiza tu contraseña de acceso</p>
                </div>
              </div>
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                {showPw ? 'Cerrar' : 'Cambiar'}
              </span>
            </button>

            {showPw && (
              <form onSubmit={handleChangePw} className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                {pwSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 py-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">¡Contraseña actualizada!</span>
                  </div>
                ) : (
                  <>
                    <Input label="Contraseña actual" type="password" value={pwForm.actual} onChange={e => { setPwForm(f => ({...f, actual: e.target.value})); setPwErrors(v => ({...v, actual: undefined})) }} error={pwErrors.actual} placeholder="••••••••" autoFocus />
                    <Input label="Nueva contraseña" type="password" value={pwForm.nueva} onChange={e => { setPwForm(f => ({...f, nueva: e.target.value})); setPwErrors(v => ({...v, nueva: undefined})) }} error={pwErrors.nueva} placeholder="Min. 8 chars, mayúscula, número, símbolo" />
                    <Input label="Confirmar nueva" type="password" value={pwForm.confirmar} onChange={e => { setPwForm(f => ({...f, confirmar: e.target.value})); setPwErrors(v => ({...v, confirmar: undefined})) }} error={pwErrors.confirmar} placeholder="••••••••" />
                    <Button type="submit" variant="primary" loading={pwSaving}>Actualizar contraseña</Button>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Logout all sessions */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldOff className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Cerrar todas las sesiones</p>
                <p className="text-xs text-slate-400">Invalida todos los tokens activos de tu cuenta</p>
              </div>
            </div>
            <Button variant="danger" size="sm" loading={logoutBusy} onClick={handleLogoutAll}>
              Cerrar sesiones
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ── Actividad ──────────────────────────────────────────────────────────────────
function ActividadSection({ user }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/auth/me/stats').then(setStats).catch(() => {})
  }, [])

  return (
    <Card>
      <CardHeader>
        <span className="font-semibold text-slate-800 dark:text-slate-200">Actividad</span>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {stats === null ? '—' : stats.total_despachos}
            </div>
            <p className="text-xs text-slate-500 mt-1">Despachos realizados</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-center">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {formatDate(user.created_at)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cuenta creada</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
            <Badge variant={ROL_BADGE[user.rol] ?? 'neutral'} className="text-sm">
              {ROL_LABELS[user.rol] ?? user.rol}
            </Badge>
            <p className="text-xs text-slate-500 mt-2">Rol en el sistema</p>
          </div>
        </div>
        {user.rol !== 'admin' && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400">
              <span className="font-medium">{(user.permisos ?? []).length} permisos</span> activos en tu cuenta.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Perfil() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  // Merge backend response into AuthContext
  async function handleUpdate() {
    await refreshUser()
  }

  return (
    <div className="py-6 px-4 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Mi Perfil</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Gestiona tu información personal y configuración de seguridad
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>

      <AvatarSection    user={user} onUpdate={handleUpdate} />
      <DatosSection     user={user} onUpdate={handleUpdate} />
      <SeguridadSection />
      <ActividadSection user={user} />
    </div>
  )
}
