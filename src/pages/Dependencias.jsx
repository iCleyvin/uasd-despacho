import { useState, useMemo } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Building2, Truck, Search } from 'lucide-react'
import { usePagination } from '../hooks/usePagination'
import Paginator from '../components/ui/Paginator'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import AccessDenied from '../components/ui/AccessDenied'
import ExportMenu from '../components/ui/ExportMenu'
import { exportDependenciasPDF } from '../lib/exportPdf'
import { exportDependenciasCSV } from '../lib/exportCsv'
import { exportDependenciasXlsx } from '../lib/exportXlsx'

const EMPTY_FORM = { nombre: '', codigo: '' }

export default function Dependencias() {
  const { dependencias, vehiculos, crearDependencia, editarDependencia, toggleDependenciaActivo } = useData()
  const { hasPermiso } = useAuth()
  const canEdit = hasPermiso('dependencias.editar')

  const { confirm: askConfirm, ConfirmDialog } = useConfirm()
  const [search,       setSearch]       = useState('')
  const [detailTarget, setDetailTarget] = useState(null)
  const [formModal,    setFormModal]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [errors,       setErrors]       = useState({})
  const [saving,       setSaving]       = useState(false)
  const [toggling,     setToggling]     = useState(false)

  if (!hasPermiso('dependencias.ver')) return <AccessDenied />

  const filtered = useMemo(() => {
    if (!search.trim()) return dependencias
    const q = search.toLowerCase()
    return dependencias.filter(d =>
      d.nombre.toLowerCase().includes(q) || d.codigo.toLowerCase().includes(q)
    )
  }, [dependencias, search])

  const { paged, page, totalPages, goTo, reset: resetPage } = usePagination(filtered, 20)

  function vehiculosDe(depId) {
    return vehiculos.filter(v => v.dependencia_id === depId)
  }

  function openDetail(d) {
    setDetailTarget(d)
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormModal(true)
  }

  function openEdit(d) {
    setDetailTarget(null)
    setEditTarget(d)
    setForm({ nombre: d.nombre, codigo: d.codigo })
    setErrors({})
    setFormModal(true)
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Campo requerido'
    if (!form.codigo.trim()) e.codigo = 'Campo requerido'
    if (form.codigo.length > 5) e.codigo = 'Máximo 5 caracteres'
    const dup = dependencias.find(d =>
      d.codigo.toUpperCase() === form.codigo.toUpperCase() &&
      (!editTarget || d.id !== editTarget.id)
    )
    if (dup) e.codigo = 'Ya existe una dependencia con ese código'
    return e
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { nombre: form.nombre.trim(), codigo: form.codigo.trim().toUpperCase() }
      if (editTarget) {
        await editarDependencia(editTarget.id, payload)
      } else {
        await crearDependencia(payload)
      }
      setFormModal(false)
    } catch (err) {
      setErrors({ codigo: err?.response?.data?.error ?? 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(d) {
    const ok = await askConfirm(`¿${d.activo ? 'Desactivar' : 'Activar'} la dependencia "${d.nombre}"?`)
    if (!ok) return
    setToggling(true)
    try {
      await toggleDependenciaActivo(d.id)
      setDetailTarget(prev => prev?.id === d.id ? { ...prev, activo: !prev.activo } : prev)
    } finally {
      setToggling(false)
    }
  }

  // dependencia actualizada en contexto (refleja cambios tras editar)
  const detail = detailTarget ? (dependencias.find(d => d.id === detailTarget.id) ?? detailTarget) : null
  const detailVehiculos = detail ? vehiculosDe(detail.id) : []

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Dependencias</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {dependencias.length} dependencias registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar nombre o código…"
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage() }}
            icon={<Search className="w-4 h-4" />}
            className="w-56"
          />
          <ExportMenu onPDF={() => exportDependenciasPDF(dependencias)} onCSV={() => exportDependenciasCSV(dependencias)} onXlsx={() => exportDependenciasXlsx(dependencias)} />
          {canEdit && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Nueva Dependencia
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Vehículos</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">Sin resultados para "{search}"</td></tr>
              )}
              {paged.map(d => (
                <tr
                  key={d.id}
                  onClick={() => openDetail(d)}
                  className="hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="font-plate font-bold text-primary-600 dark:text-primary-400">{d.codigo}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold text-sm">
                      {vehiculosDe(d.id).length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={d.activo ? 'success' : 'neutral'}>
                      {d.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginator page={page} totalPages={totalPages} onPage={goTo} total={filtered.length} pageSize={20} />
      </Card>

      {/* ── Modal de detalle ─────────────────────────────────────────────── */}
      <Modal
        open={!!detail}
        onClose={() => setDetailTarget(null)}
        title={detail?.nombre ?? ''}
        size="md"
      >
        {detail && (
          <div className="px-6 pb-6 space-y-5">
            {/* Datos básicos */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Código</p>
                <p className="font-plate font-bold text-primary-600 dark:text-primary-400 text-lg">{detail.codigo}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Estado</p>
                <Badge variant={detail.activo ? 'success' : 'neutral'}>
                  {detail.activo ? 'Activa' : 'Inactiva'}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-slate-400 uppercase mb-1">Nombre completo</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{detail.nombre}</p>
              </div>
            </div>

            {/* Vehículos asignados */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Vehículos asignados ({detailVehiculos.length})
              </p>
              {detailVehiculos.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Sin vehículos asignados</p>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                  {detailVehiculos.map(v => (
                    <div key={v.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="font-plate font-bold text-primary-600 dark:text-primary-400 text-sm">{v.placa}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs ml-2">{v.marca} {v.modelo}</span>
                      </div>
                      <Badge variant={v.activo ? 'success' : 'neutral'} className="text-xs">
                        {v.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones */}
            {canEdit && (
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-700">
                <Button
                  variant="secondary"
                  icon={<Edit2 className="w-4 h-4" />}
                  onClick={() => openEdit(detail)}
                  className="flex-1"
                >
                  Editar
                </Button>
                <Button
                  variant={detail.activo ? 'danger' : 'primary'}
                  icon={detail.activo
                    ? <ToggleRight className="w-4 h-4" />
                    : <ToggleLeft className="w-4 h-4" />}
                  onClick={() => handleToggle(detail)}
                  loading={toggling}
                  className="flex-1"
                >
                  {detail.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {ConfirmDialog}

      {/* ── Modal de formulario (crear / editar) ─────────────────────────── */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? 'Editar Dependencia' : 'Nueva Dependencia'}
        size="sm"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input
            label="Nombre *"
            placeholder="Ej: Rectoría"
            value={form.nombre}
            onChange={e => { setForm(f => ({ ...f, nombre: e.target.value })); setErrors(er => ({ ...er, nombre: undefined })) }}
            error={errors.nombre}
            autoFocus
          />
          <Input
            label="Código *"
            placeholder="Ej: REC (máx. 5 caracteres)"
            value={form.codigo}
            onChange={e => { setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() })); setErrors(er => ({ ...er, codigo: undefined })) }}
            error={errors.codigo}
            mono
            maxLength={5}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>
              {editTarget ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
