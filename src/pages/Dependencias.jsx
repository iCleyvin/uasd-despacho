import { useState } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useData } from '../context/DataContext'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'

const EMPTY_FORM = { nombre: '', codigo: '' }

export default function Dependencias() {
  const { dependencias, vehiculos, crearDependencia, editarDependencia, toggleDependenciaActivo } = useData()

  const [formModal,  setFormModal]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)

  function vehiculosCount(depId) {
    return vehiculos.filter(v => v.dependencia_id === depId).length
  }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setFormModal(true)
  }

  function openEdit(d) {
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
    await new Promise(r => setTimeout(r, 300))
    const payload = { nombre: form.nombre.trim(), codigo: form.codigo.trim().toUpperCase() }
    if (editTarget) {
      editarDependencia(editTarget.id, payload)
    } else {
      crearDependencia(payload)
    }
    setSaving(false)
    setFormModal(false)
  }

  function handleToggle(d) {
    if (confirm(`¿${d.activo ? 'Desactivar' : 'Activar'} la dependencia "${d.nombre}"?`)) {
      toggleDependenciaActivo(d.id)
    }
  }

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Dependencias</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {dependencias.length} dependencias registradas
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Nueva Dependencia
        </Button>
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {dependencias.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-plate font-bold text-primary-600">{d.codigo}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold text-sm">
                      {vehiculosCount(d.id)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={d.activo ? 'success' : 'neutral'}>
                      {d.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(d)}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${d.activo ? 'text-green-500 hover:text-red-500' : 'text-slate-400 hover:text-green-500'}`}
                        title={d.activo ? 'Desactivar' : 'Activar'}
                      >
                        {d.activo
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

      {/* Modal */}
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
