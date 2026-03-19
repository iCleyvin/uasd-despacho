import { useState, useEffect } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, ShieldOff, KeyRound, Copy, Check, LogOut, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import { useToast } from '../context/ToastContext'
import { ROL_LABELS, formatDate, validatePassword } from '../utils/format'
import { api } from '../lib/api'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card from '../components/ui/Card'

const ROL_BADGE = {
  admin:       'danger',
  supervisor:  'gold',
  despachador: 'info',
}

const EMPTY_FORM = {
  nombre:    '',
  apellido:  '',
  email:     '',
  password:  '',
  rol:       'despachador',
}

const PERMISO_GRUPOS = [
  {
    grupo: 'Despachos',
    permisos: [
      { id: 'despachos.ver',   label: 'Ver historial' },
      { id: 'despachos.crear', label: 'Crear despachos' },
    ],
  },
  {
    grupo: 'Inventario',
    permisos: [
      { id: 'inventario.ver',    label: 'Ver inventario' },
      { id: 'inventario.editar', label: 'Gestionar productos y entradas' },
    ],
  },
  {
    grupo: 'Vehículos',
    permisos: [
      { id: 'vehiculos.ver',    label: 'Ver vehículos' },
      { id: 'vehiculos.editar', label: 'Crear/editar/activar vehículos' },
    ],
  },
  {
    grupo: 'Dependencias',
    permisos: [
      { id: 'dependencias.ver',    label: 'Ver dependencias' },
      { id: 'dependencias.editar', label: 'Crear/editar dependencias' },
    ],
  },
  {
    grupo: 'Reportes',
    permisos: [
      { id: 'reportes.ver', label: 'Ver reportes' },
    ],
  },
  {
    grupo: 'Auditoría',
    permisos: [
      { id: 'auditoria.ver', label: 'Ver auditoría' },
    ],
  },
]

const PERMISOS_POR_ROL = {
  supervisor: ['despachos.ver','despachos.crear','inventario.ver','inventario.editar','vehiculos.ver','vehiculos.editar','dependencias.ver','dependencias.editar','reportes.ver','auditoria.ver'],
  despachador: ['despachos.ver','despachos.crear','inventario.ver','vehiculos.ver','dependencias.ver','reportes.ver'],
}

export default function Usuarios() {
  const { hasRole } = useAuth()
  const { usuarios, crearUsuario, editarUsuario, toggleUsuarioActivo, loadUsuarios } = useData()
  const navigate = useNavigate()

  useEffect(() => { loadUsuarios() }, [loadUsuarios])

  const [formModal,   setFormModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [errors,      setErrors]      = useState({})
  const [saving,      setSaving]      = useState(false)
  const [resetModal,  setResetModal]  = useState(false)
  const [resetData,   setResetData]   = useState(null)   // { token, usuario, email, expires }
  const [resetLoading,setResetLoading]= useState(false)
  const [copied,      setCopied]      = useState(false)

  const [permisosModal,    setPermisosModal]    = useState(false)
  const [permisosTarget,   setPermisosTarget]   = useState(null)
  const [permisosSelected, setPermisosSelected] = useState([])
  const [permisosSaving,   setPermisosSaving]   = useState(false)

  const { confirm: askConfirm, ConfirmDialog } = useConfirm()
  const { showToast } = useToast()

  // Redirect non-admin
  if (!hasRole('admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <ShieldOff className="w-12 h-12" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Solo administradores pueden gestionar usuarios.</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
      </div>
    )
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormModal(true)
  }

  function openEdit(u) {
    setEditTarget(u)
    setForm({
      nombre:   u.nombre,
      apellido: u.apellido,
      email:    u.email,
      password: '',
      rol:      u.rol,
    })
    setErrors({})
    setFormModal(true)
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim())   e.nombre   = 'Campo requerido'
    if (!form.apellido.trim()) e.apellido  = 'Campo requerido'
    if (!form.email.trim())    e.email     = 'Campo requerido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Correo inválido'
    if (!editTarget && !form.password) e.password = 'La contraseña es requerida para un nuevo usuario'
    if (form.password) {
      const pwErr = validatePassword(form.password)
      if (pwErr) e.password = pwErr
    }
    const dup = usuarios.find(u => u.email === form.email && (!editTarget || u.id !== editTarget.id))
    if (dup) e.email = 'Ya existe un usuario con ese correo'
    return e
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        nombre:   form.nombre.trim(),
        apellido: form.apellido.trim(),
        email:    form.email.trim(),
        rol:      form.rol,
        ...(form.password ? { password: form.password } : {}),
      }
      if (editTarget) {
        await editarUsuario(editTarget.id, payload)
      } else {
        await crearUsuario(payload)
      }
      setFormModal(false)
    } finally {
      setSaving(false)
    }
  }

  function field(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  async function handleToggle(u) {
    const ok = await askConfirm(`¿${u.activo ? 'Desactivar' : 'Activar'} al usuario ${u.nombre} ${u.apellido}?`)
    if (ok) toggleUsuarioActivo(u.id)
  }

  async function handleGenerarReset(u) {
    setResetData(null)
    setCopied(false)
    setResetLoading(true)
    setResetModal(true)
    try {
      const data = await api.post(`/auth/generate-reset-token/${u.id}`)
      setResetData(data)
    } catch (err) {
      setResetModal(false)
      alert(err.message ?? 'Error al generar el token')
    } finally {
      setResetLoading(false)
    }
  }

  async function handleInvalidarSesiones(u) {
    const ok = await askConfirm(`¿Cerrar todas las sesiones activas de ${u.nombre} ${u.apellido}?`)
    if (!ok) return
    try {
      await api.post(`/auth/invalidate-sessions/${u.id}`)
      showToast(`Sesiones de ${u.nombre} ${u.apellido} invalidadas.`, 'success')
    } catch (err) {
      showToast(err.message ?? 'Error al invalidar sesiones', 'error')
    }
  }

  function getResetUrl() {
    if (!resetData) return ''
    return `${window.location.origin}/reset-password?token=${resetData.token}`
  }

  function copyUrl() {
    navigator.clipboard.writeText(getResetUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleOpenPermisos(u) {
    setPermisosTarget(u)
    setPermisosSelected(u.permisos ?? [])
    setPermisosModal(true)
  }

  async function handleSavePermisos() {
    setPermisosSaving(true)
    try {
      await api.patch(`/usuarios/${permisosTarget.id}/permisos`, { permisos: permisosSelected })
      await loadUsuarios()
      setPermisosModal(false)
    } finally {
      setPermisosSaving(false)
    }
  }

  function togglePermiso(id, checked) {
    if (checked) {
      setPermisosSelected(prev => [...prev, id])
    } else {
      setPermisosSelected(prev => prev.filter(p => p !== id))
    }
  }

  return (
    <div className="py-6 px-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {usuarios.length} usuarios · {usuarios.filter(u => u.activo).length} activos
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Nuevo Usuario
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Rol</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {usuarios.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!u.activo ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold text-sm shrink-0">
                        {u.nombre[0]}{u.apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{u.nombre} {u.apellido}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROL_BADGE[u.rol] ?? 'neutral'}>
                      {ROL_LABELS[u.rol] ?? u.rol}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={u.activo ? 'success' : 'neutral'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenPermisos(u)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-500 transition-colors"
                        title="Gestionar permisos"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerarReset(u)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-amber-500 transition-colors"
                        title="Generar link para resetear contraseña"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      {u.activo && (
                        <button
                          onClick={() => handleInvalidarSesiones(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors"
                          title="Cerrar todas las sesiones activas"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggle(u)}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${u.activo ? 'text-green-500 hover:text-red-500' : 'text-slate-400 hover:text-green-500'}`}
                        title={u.activo ? 'Desactivar' : 'Activar'}
                      >
                        {u.activo
                          ? <ToggleRight className="w-5 h-5" />
                          : <ToggleLeft className="w-5 h-5" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal reset de contraseña */}
      <Modal
        open={resetModal}
        onClose={() => setResetModal(false)}
        title="Link de reset de contraseña"
        size="md"
      >
        <div className="p-6 space-y-4">
          {resetLoading ? (
            <p className="text-center text-slate-500 py-6">Generando token...</p>
          ) : resetData ? (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Token generado para {resetData.usuario}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Expira en 1 hora. Uso único.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">
                  Enlace para compartir con el usuario
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={getResetUrl()}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono select-all"
                  />
                  <button
                    onClick={copyUrl}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      copied
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Comparte este enlace con <strong>{resetData.email}</strong>. El usuario deberá establecer su nueva contraseña antes de que expire.
              </p>
            </>
          ) : null}
          <Button variant="secondary" className="w-full" onClick={() => setResetModal(false)}>
            Cerrar
          </Button>
        </div>
      </Modal>

      {/* Modal crear/editar */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? `Editar usuario — ${editTarget.nombre} ${editTarget.apellido}` : 'Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              placeholder="Juan"
              value={form.nombre}
              onChange={e => field('nombre', e.target.value)}
              error={errors.nombre}
              autoFocus
            />
            <Input
              label="Apellido *"
              placeholder="Pérez"
              value={form.apellido}
              onChange={e => field('apellido', e.target.value)}
              error={errors.apellido}
            />
          </div>
          <Input
            label="Correo electrónico *"
            type="email"
            placeholder="usuario@uasd.edu.do"
            value={form.email}
            onChange={e => field('email', e.target.value)}
            error={errors.email}
          />
          <Input
            label={editTarget ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña temporal *'}
            type="password"
            placeholder={editTarget ? '(sin cambio)' : 'Mínimo 6 caracteres'}
            value={form.password}
            onChange={e => field('password', e.target.value)}
            error={errors.password}
          />
          <Select
            label="Rol"
            value={form.rol}
            onChange={e => field('rol', e.target.value)}
          >
            {Object.entries(ROL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>
              {editTarget ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal permisos */}
      <Modal
        open={permisosModal}
        onClose={() => setPermisosModal(false)}
        title={`Permisos — ${permisosTarget?.nombre} ${permisosTarget?.apellido}`}
        size="lg"
      >
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Admin siempre tiene acceso total. Los permisos solo aplican a supervisores y despachadores.
          </p>

          {permisosTarget?.rol === 'admin' ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Los administradores tienen acceso total y no requieren permisos específicos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PERMISO_GRUPOS.map(grupo => (
                <div key={grupo.grupo} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    {grupo.grupo}
                  </p>
                  {grupo.permisos.map(permiso => (
                    <label key={permiso.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permisosSelected.includes(permiso.id)}
                        onChange={e => togglePermiso(permiso.id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{permiso.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 gap-3">
            <div>
              {permisosTarget?.rol !== 'admin' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPermisosSelected(PERMISOS_POR_ROL[permisosTarget?.rol] ?? [])}
                >
                  Restaurar defaults
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setPermisosModal(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={permisosSaving}
                onClick={handleSavePermisos}
                disabled={permisosTarget?.rol === 'admin'}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      {ConfirmDialog}
    </div>
  )
}
