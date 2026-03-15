import { useState, useMemo } from 'react'
import { Plus, Edit2, Power, Search, Fuel, LayoutGrid, List } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardBody } from '../components/ui/Card'

const TIPO_OPTIONS = ['sedan', 'pickup', 'camion', 'autobus', 'motocicleta', 'otro']
const COMBUSTIBLE_OPTIONS = ['gasolina', 'gasoil', 'electrico', 'hibrido']

const TIPO_ICON = {
  sedan:       '🚗',
  pickup:      '🛻',
  camion:      '🚛',
  autobus:     '🚌',
  motocicleta: '🏍',
  otro:        '⚙',
}

const COMBUSTIBLE_BADGE = {
  gasolina: 'info',
  gasoil:   'warning',
  electrico:'success',
  hibrido:  'neutral',
}

const EMPTY_FORM = {
  placa:          '',
  marca:          '',
  modelo:         '',
  año:            new Date().getFullYear(),
  tipo:           'sedan',
  color:          '',
  dependencia_id: '',
  combustible:    'gasolina',
}

export default function Vehiculos() {
  const { vehiculos, dependencias, despachos, productos, crearVehiculo, editarVehiculo, toggleVehiculoActivo } = useData()

  const [filterDep,  setFilterDep]  = useState('')
  const [search,     setSearch]     = useState('')
  const [viewMode,   setViewMode]   = useState('grid')
  const [detailV,    setDetailV]    = useState(null)
  const [formModal,  setFormModal]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)

  const filtered = useMemo(() => vehiculos.filter(v => {
    if (filterDep && v.dependencia_id !== Number(filterDep)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!v.placa.toLowerCase().includes(q) && !v.marca.toLowerCase().includes(q) && !v.modelo.toLowerCase().includes(q)) return false
    }
    return true
  }), [vehiculos, filterDep, search])

  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, dependencia_id: dependencias[0]?.id ?? '' })
    setErrors({})
    setFormModal(true)
  }

  function openEdit(v) {
    setEditTarget(v)
    setForm({
      placa:          v.placa,
      marca:          v.marca,
      modelo:         v.modelo,
      año:            v.año,
      tipo:           v.tipo,
      color:          v.color,
      dependencia_id: v.dependencia_id,
      combustible:    v.combustible,
    })
    setErrors({})
    setFormModal(true)
  }

  function validate() {
    const e = {}
    if (!form.placa.trim())          e.placa = 'Campo requerido'
    if (!form.marca.trim())          e.marca = 'Campo requerido'
    if (!form.modelo.trim())         e.modelo = 'Campo requerido'
    if (!form.dependencia_id)        e.dependencia_id = 'Seleccione una dependencia'
    if (!form.año || form.año < 1990) e.año = 'Año inválido'
    return e
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    const payload = { ...form, año: Number(form.año), dependencia_id: Number(form.dependencia_id) }
    if (editTarget) {
      editarVehiculo(editTarget.id, payload)
    } else {
      crearVehiculo(payload)
    }
    setSaving(false)
    setFormModal(false)
  }

  function field(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Vehículos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {vehiculos.filter(v => v.activo).length} activos · {vehiculos.filter(v => !v.activo).length} inactivos
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Nuevo Vehículo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Buscar placa, marca o modelo…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="sm:w-64"
        />
        <Select
          value={filterDep}
          onChange={e => setFilterDep(e.target.value)}
          className="sm:w-52"
        >
          <option value="">Todas las dependencias</option>
          {dependencias.map(d => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </Select>
        <div className="flex items-center gap-1 sm:ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx('w-9 h-9 flex items-center justify-center rounded-lg border transition-colors',
              viewMode === 'grid'
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
            title="Vista cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx('w-9 h-9 flex items-center justify-center rounded-lg border transition-colors',
              viewMode === 'list'
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            )}
            title="Vista lista"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista (tabla) */}
      {viewMode === 'list' && (
        <Card className="overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Placa</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Vehículo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Dependencia</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Combustible</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">No se encontraron vehículos.</td></tr>
                )}
                {filtered.map(v => {
                  const dep = dependencias.find(d => d.id === v.dependencia_id)
                  return (
                    <tr
                      key={v.id}
                      className={clsx('hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer', !v.activo && 'opacity-50')}
                      onClick={() => setDetailV(v)}
                    >
                      <td className="px-4 py-3 font-plate font-bold text-primary-600 text-base">{v.placa}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{v.marca} {v.modelo}</p>
                        <p className="text-xs text-slate-400">{TIPO_ICON[v.tipo] ?? '⚙'} {v.tipo} · {v.año}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{dep?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={COMBUSTIBLE_BADGE[v.combustible] ?? 'neutral'}>
                          <Fuel className="w-3 h-3 mr-1" />{v.combustible}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={v.activo ? 'success' : 'neutral'}>{v.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEdit(v)}>Editar</Button>
                          <Button
                            variant={v.activo ? 'danger' : 'secondary'}
                            size="sm"
                            icon={<Power className="w-3.5 h-3.5" />}
                            onClick={() => { if (confirm(`¿${v.activo ? 'Desactivar' : 'Activar'} vehículo ${v.placa}?`)) toggleVehiculoActivo(v.id) }}
                          >
                            {v.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Grid (cuadrícula) */}
      {viewMode === 'grid' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(v => {
          const dep = dependencias.find(d => d.id === v.dependencia_id)
          return (
            <Card
              key={v.id}
              className={clsx('cursor-pointer hover:shadow-md transition-shadow', !v.activo && 'opacity-50')}
              onClick={() => setDetailV(v)}
            >
              <CardBody className="space-y-3">
                {/* Placa + status */}
                <div className="flex items-start justify-between gap-2">
                  <span className="font-plate font-bold text-primary-600 text-xl">{v.placa}</span>
                  <Badge variant={v.activo ? 'success' : 'neutral'}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                {/* Tipo + marca/modelo */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{TIPO_ICON[v.tipo] ?? '⚙'}</span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-slate-400">{v.año} · {v.tipo}</p>
                  </div>
                </div>

                {/* Color + combustible */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                    style={{ background: v.color.toLowerCase() === 'blanco' ? '#fff' :
                             v.color.toLowerCase() === 'negro' ? '#1e293b' :
                             v.color.toLowerCase() === 'azul' ? '#1d4ed8' :
                             v.color.toLowerCase() === 'gris' ? '#94a3b8' :
                             v.color.toLowerCase() === 'rojo' ? '#dc2626' : '#94a3b8' }}
                  />
                  <span className="text-xs text-slate-500">{v.color}</span>
                  <Badge variant={COMBUSTIBLE_BADGE[v.combustible] ?? 'neutral'} className="ml-auto">
                    <Fuel className="w-3 h-3 mr-1" />{v.combustible}
                  </Badge>
                </div>

                {/* Dependencia */}
                <p className="text-xs text-slate-400 truncate">{dep?.nombre ?? '—'}</p>

                {/* Actions */}
                <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Edit2 className="w-3.5 h-3.5" />}
                    className="flex-1"
                    onClick={() => openEdit(v)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant={v.activo ? 'danger' : 'secondary'}
                    size="sm"
                    icon={<Power className="w-3.5 h-3.5" />}
                    onClick={() => {
                      if (confirm(`¿${v.activo ? 'Desactivar' : 'Activar'} vehículo ${v.placa}?`)) {
                        toggleVehiculoActivo(v.id)
                      }
                    }}
                  >
                    {v.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            No se encontraron vehículos con los filtros aplicados.
          </div>
        )}
      </div>}

      {/* Detail Modal */}
      <VehiculoDetailModal
        vehiculo={detailV}
        dependencias={dependencias}
        despachos={despachos}
        productos={productos}
        onClose={() => setDetailV(null)}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={formModal}
        onClose={() => setFormModal(false)}
        title={editTarget ? `Editar ${editTarget.placa}` : 'Nuevo Vehículo'}
        size="lg"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Placa *"
              placeholder="A-00000"
              value={form.placa}
              onChange={e => field('placa', e.target.value.toUpperCase())}
              error={errors.placa}
              mono
            />
            <Select
              label="Dependencia *"
              value={form.dependencia_id}
              onChange={e => field('dependencia_id', e.target.value)}
              error={errors.dependencia_id}
            >
              <option value="">Seleccionar…</option>
              {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
            <Input
              label="Marca *"
              placeholder="Toyota"
              value={form.marca}
              onChange={e => field('marca', e.target.value)}
              error={errors.marca}
            />
            <Input
              label="Modelo *"
              placeholder="Hilux"
              value={form.modelo}
              onChange={e => field('modelo', e.target.value)}
              error={errors.modelo}
            />
            <Input
              label="Año *"
              type="number"
              min="1990"
              max={new Date().getFullYear() + 1}
              value={form.año}
              onChange={e => field('año', e.target.value)}
              error={errors.año}
            />
            <Input
              label="Color"
              placeholder="Blanco"
              value={form.color}
              onChange={e => field('color', e.target.value)}
            />
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={e => field('tipo', e.target.value)}
            >
              {TIPO_OPTIONS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
            </Select>
            <Select
              label="Combustible"
              value={form.combustible}
              onChange={e => field('combustible', e.target.value)}
            >
              {COMBUSTIBLE_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={saving}>
              {editTarget ? 'Guardar cambios' : 'Crear vehículo'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function VehiculoDetailModal({ vehiculo, dependencias, despachos, productos, onClose }) {
  if (!vehiculo) return null
  const dep = dependencias.find(d => d.id === vehiculo.dependencia_id)

  const vehiculoDespachos = despachos
    .filter(d => d.vehiculo_id === vehiculo.id)
    .sort((a, b) => b.fecha_despacho.localeCompare(a.fecha_despacho))
    .slice(0, 5)

  // Total combustible este mes
  const thisMonth = new Date().toISOString().slice(0, 7)
  const combustibleMes = despachos
    .filter(d => d.vehiculo_id === vehiculo.id && d.fecha_despacho.startsWith(thisMonth))
    .filter(d => {
      const p = productos.find(p => p.id === d.producto_id)
      return p?.categoria === 'combustible'
    })
    .reduce((sum, d) => sum + d.cantidad, 0)

  return (
    <Modal open={!!vehiculo} onClose={onClose} title={`${vehiculo.placa} — ${vehiculo.marca} ${vehiculo.modelo}`} size="xl">
      <div className="p-6 space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Field label="Placa"><span className="font-plate font-bold text-primary-600 text-xl">{vehiculo.placa}</span></Field>
          <Field label="Marca/Modelo" value={`${vehiculo.marca} ${vehiculo.modelo}`} />
          <Field label="Año" value={vehiculo.año} />
          <Field label="Tipo" value={`${TIPO_ICON[vehiculo.tipo]} ${vehiculo.tipo}`} />
          <Field label="Color" value={vehiculo.color} />
          <Field label="Combustible">
            <Badge variant={COMBUSTIBLE_BADGE[vehiculo.combustible] ?? 'neutral'}>{vehiculo.combustible}</Badge>
          </Field>
          <Field label="Dependencia" value={dep?.nombre ?? '—'} />
          <Field label="Estado">
            <Badge variant={vehiculo.activo ? 'success' : 'neutral'}>{vehiculo.activo ? 'Activo' : 'Inactivo'}</Badge>
          </Field>
          <Field label="Combustible este mes" value={`${formatNumber(combustibleMes, 0)} galones`} />
        </div>

        {/* Últimos despachos */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Últimos 5 despachos</h3>
          {vehiculoDespachos.length === 0 ? (
            <p className="text-sm text-slate-400">Sin despachos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left">
                  <th className="pb-1 font-medium">Fecha</th>
                  <th className="pb-1 font-medium">Producto</th>
                  <th className="pb-1 font-medium text-right">Cantidad</th>
                  <th className="pb-1 font-medium hidden sm:table-cell">Solicitado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {vehiculoDespachos.map(d => {
                  const p = productos.find(p => p.id === d.producto_id)
                  return (
                    <tr key={d.id}>
                      <td className="py-1.5 text-slate-500">{formatDateTime(d.fecha_despacho)}</td>
                      <td className="py-1.5 font-medium text-slate-800 dark:text-slate-200">{p?.nombre}</td>
                      <td className="py-1.5 text-right">{formatNumber(d.cantidad, 0)} {d.unidad}</td>
                      <td className="py-1.5 text-slate-500 hidden sm:table-cell">{d.solicitado_por}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, value, children }) {
  return (
    <div>
      <p className="text-xs uppercase font-medium text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      {children ?? <p className="text-slate-800 dark:text-slate-200">{value ?? '—'}</p>}
    </div>
  )
}
