import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, ShieldOff, KeyRound, Copy, Check, LogOut, Shield, Trash2, History } from 'lucide-react'
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
import Paginator from '../components/ui/Paginator'
import { usePagination } from '../hooks/usePagination'

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

function UserAvatar({ u, size = 'md' }) {
  const sizes = size === 'lg'
    ? 'w-14 h-14 text-xl'
    : 'w-8 h-8 text-sm'
  return (
    <div className={`${sizes} rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold shrink-0`}>
      {u.nombre[0]}{u.apellido[0]}
    </div>
  )
}

export default function Usuarios() {
  const { hasRole } = useAuth()
  const { usuarios, crearUsuario, editarUsuario, toggleUsuarioActivo, eliminarUsuario, loadUsuarios } = useData()
  const navigate = useNavigate()

  useEffect(() => { loadUsuarios() }, [loadUsuarios])

  const [detailTarget,  setDetailTarget]  = useState(null)
  const [formModal,     setFormModal]     = useState(false)
  const [editTarget,    setEditTarget]    = useState(null)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [errors,        setErrors]        = useState({})
  const [saving,        setSaving]        = useState(false)
  const [toggling,      setToggling]      = useState(false)
  const [resetModal,    setResetModal]    = useState(false)
  const [resetData,     setResetData]     = useState(null)
  const [resetLoading,  setResetLoading]  = useState(false)
  const [copied,        setCopied]        = useState(false)

  const [permisosModal,    setPermisosModal]    = useState(false)
  const [permisosTarget,   setPermisosTarget]   = useState(null)
  const [permisosSelected, setPermisosSelected] = useState([])
  const [permisosSaving,   setPermisosSaving]   = useState(false)

  const [eliminadosModal,   setEliminadosModal]   = useState(false)
  const [eliminados,        setEliminados]         = useState([])
  const [eliminadosLoading, setEliminadosLoading] = useState(false)

  const { confirm: askConfirm, ConfirmDialog } = useConfirm()
  const { showToast } = useToast()

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

  // El detalle siempre refleja el estado actualizado del contexto
  const detail = detailTarget ? (usuarios.find(u => u.id === detailTarget.id) ?? detailTarget) : null

  const { paged, page, totalPages, goTo } = usePagination(usuarios, 15)

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormModal(true)
  }

  function openEdit(u) {
    setDetailTarget(null)
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
    if (!ok) return
    setToggling(true)
    try {
      await toggleUsuarioActivo(u.id)
    } finally {
      setToggling(false)
    }
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
      showToast(err.message ?? 'Error al generar el token', 'error')
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

  async function handleEliminar(u) {
    const ok = await askConfirm(
      `¿Eliminar permanentemente a ${u.nombre} ${u.apellido}?\n\nEl usuario no podrá iniciar sesión. Su historial de despachos y registros de auditoría se conservan.`,
      { danger: true }
    )
    if (!ok) return
    try {
      await eliminarUsuario(u.id)
      setDetailTarget(null)
      showToast(`Usuario ${u.nombre} ${u.apellido} eliminado.`, 'success')
    } catch (err) {
      showToast(err.message ?? 'Error al eliminar el usuario', 'error')
    }
  }

  async function openEliminados() {
    setEliminadosModal(true)
    setEliminadosLoading(true)
    try {
      const res = await api.get('/usuarios/eliminados')
      setEliminados(res.data)
    } catch (err) {
      showToast(err.message ?? 'Error al cargar usuarios eliminados', 'error')
      setEliminadosModal(false)
    } finally {
      setEliminadosLoading(false)
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
    setDetailTarget(null)
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paged.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setDetailTarget(u)}
                  className={`hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer ${!u.activo ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar u={u} />
                      <p className="font-medium text-slate-800 dark:text-slate-200">{u.nombre} {u.apellido}</p>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} totalPages={totalPages} onPage={goTo} total={usuarios.length} pageSize={15} />
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={openEliminados}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            Ver usuarios eliminados
          </button>
        </div>
      </Card>

      {/* ── Modal de detalle ───────────────────────────────────────────── */}
      <Modal
        open={!!detail}
        onClose={() => setDetailTarget(null)}
        title="Detalle de usuario"
        size="md"
      >
        {detail && (
          <div className="px-6 pb-6 space-y-5">
            {/* Cabecera */}
            <div className="flex items-center gap-4">
              <UserAvatar u={detail} size="lg" />
              <div>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{detail.nombre} {detail.apellido}</p>
                <p className="text-sm text-slate-500">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={ROL_BADGE[detail.rol] ?? 'neutral'}>{ROL_LABELS[detail.rol] ?? detail.rol}</Badge>
                  <Badge variant={detail.activo ? 'success' : 'neutral'}>{detail.activo ? 'Activo' : 'Inactivo'}</Badge>
                </div>
              </div>
            </div>

            {/* Datos */}
            <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 dark:border-slate-700 pt-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Creado</p>
                <p className="text-slate-700 dark:text-slate-300">{formatDate(detail.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Permisos activos</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {detail.rol === 'admin' ? 'Acceso total' : `${(detail.permisos ?? []).length} permisos`}
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  icon={<Edit2 className="w-4 h-4" />}
                  onClick={() => openEdit(detail)}
                  className="w-full"
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  icon={<Shield className="w-4 h-4" />}
                  onClick={() => handleOpenPermisos(detail)}
                  className="w-full"
                >
                  Permisos
                </Button>
                <Button
                  variant="secondary"
                  icon={<KeyRound className="w-4 h-4" />}
                  onClick={() => handleGenerarReset(detail)}
                  className="w-full"
                >
                  Reset contraseña
                </Button>
                {detail.activo && (
                  <Button
                    variant="secondary"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => handleInvalidarSesiones(detail)}
                    className="w-full"
                  >
                    Cerrar sesiones
                  </Button>
                )}
              </div>
              <Button
                variant={detail.activo ? 'danger' : 'primary'}
                icon={detail.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                onClick={() => handleToggle(detail)}
                loading={toggling}
                className="w-full"
              >
                {detail.activo ? 'Desactivar usuario' : 'Activar usuario'}
              </Button>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                <Button
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => handleEliminar(detail)}
                  className="w-full"
                >
                  Eliminar usuario
                </Button>
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2">
                  El historial de despachos y auditoría se conserva.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal reset de contraseña ──────────────────────────────────── */}
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
              {resetData.email_sent ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">✓ Email enviado a {resetData.email}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">El usuario recibirá el enlace en su correo. Expira en 1 hora.</p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Token generado para {resetData.usuario}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Email no configurado — comparte el enlace manualmente. Expira en 1 hora.</p>
                </div>
              )}
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

      {/* ── Modal crear/editar ─────────────────────────────────────────── */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? `Editar — ${editTarget.nombre} ${editTarget.apellido}` : 'Nuevo Usuario'}
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

      {/* ── Modal permisos ─────────────────────────────────────────────── */}
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

      {/* ── Modal usuarios eliminados ──────────────────────────────────── */}
      <Modal
        open={eliminadosModal}
        onClose={() => setEliminadosModal(false)}
        title="Usuarios eliminados"
        size="lg"
      >
        <div className="p-6">
          {eliminadosLoading ? (
            <p className="text-center text-slate-500 py-8">Cargando...</p>
          ) : eliminados.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">No hay usuarios eliminados.</p>
          ) : (
            <div className="space-y-1">
              {eliminados.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0">
                    {u.nombre[0]}{u.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-through">
                      {u.nombre} {u.apellido}
                    </p>
                    <p className="text-xs text-slate-400">{u.email.replace(/__eliminado__\d+$/, '')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={ROL_BADGE[u.rol] ?? 'neutral'}>{ROL_LABELS[u.rol] ?? u.rol}</Badge>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Eliminado {formatDate(u.eliminado_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              {eliminados.length > 0 && `${eliminados.length} usuario${eliminados.length !== 1 ? 's' : ''} eliminado${eliminados.length !== 1 ? 's' : ''} · `}
              El historial de despachos y auditoría se conserva.
            </p>
          </div>
        </div>
      </Modal>

      {ConfirmDialog}
    </div>
  )
}
