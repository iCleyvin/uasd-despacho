import { useState, useMemo, useCallback } from 'react'
import { Plus, Edit2, Power, Search, Fuel, LayoutGrid, List } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardBody } from '../components/ui/Card'
import AccessDenied from '../components/ui/AccessDenied'
import ExportMenu from '../components/ui/ExportMenu'
import { exportVehiculosPDF } from '../lib/exportPdf'
import { exportVehiculosCSV } from '../lib/exportCsv'
import { exportVehiculosXlsx } from '../lib/exportXlsx'

const TIPO_OPTIONS = ['Sedan', 'Jeepeta', 'Pickup', 'Camion', 'Microbus', 'Minibus', 'Autobus', 'Tren', 'Motocicleta', 'Otro']
const COMBUSTIBLE_OPTIONS = ['Gasolina', 'Gasoil', 'Electrico', 'Hibrido']

const TIPO_ICON = {
  Sedan:       '🚗',
  Jeepeta:     '🚙',
  Pickup:      '🛻',
  Camion:      '🚛',
  Microbus:    '🚐',
  Minibus:     '🚌',
  Autobus:     '🚌',
  Tren:        '🚂',
  Motocicleta: '🏍',
  Otro:        '⚙',
}

const COMBUSTIBLE_BADGE = {
  Gasolina: 'info',
  Gasoil:   'warning',
  Electrico:'success',
  Hibrido:  'neutral',
}

const EMPTY_FORM = {
  placa:          '',
  ficha_vieja:    '',
  matricula:      '',
  chasis:         '',
  marca:          '',
  modelo:         '',
  anio:           new Date().getFullYear(),
  tipo:           'Sedan',
  color:          '',
  dependencia_id: '',
  combustible:    'Gasolina',
}

export default function Vehiculos() {
  const { vehiculos, dependencias, despachos, productos, crearVehiculo, editarVehiculo, toggleVehiculoActivo } = useData()
  const { hasPermiso } = useAuth()
  const canEdit = hasPermiso('vehiculos.editar')

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
      const matchFichaVieja = v.ficha_vieja ? v.ficha_vieja.toLowerCase().includes(q) : false
      const matchChasis     = v.chasis      ? v.chasis.toLowerCase().includes(q)      : false
      if (!v.placa.toLowerCase().includes(q) && !v.marca.toLowerCase().includes(q) && !v.modelo.toLowerCase().includes(q) && !matchFichaVieja && !matchChasis) return false
    }
    return true
  }), [vehiculos, filterDep, search])

  if (!hasPermiso('vehiculos.ver')) return <AccessDenied />

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
      ficha_vieja:    v.ficha_vieja ?? '',
      matricula:      v.matricula ?? '',
      chasis:         v.chasis ?? '',
      marca:          v.marca,
      modelo:         v.modelo,
      anio:           v.anio,
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
    if (!form.anio || form.anio < 1990) e.anio = 'Año inválido'
    return e
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form, anio: Number(form.anio), dependencia_id: Number(form.dependencia_id) }
      if (editTarget) {
        await editarVehiculo(editTarget.id, payload)
      } else {
        await crearVehiculo(payload)
      }
      setFormModal(false)
    } catch (err) {
      setErrors({ placa: err?.response?.data?.error ?? 'Error al guardar' })
    } finally {
      setSaving(false)
    }
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
        <div className="flex items-center gap-2">
          <ExportMenu onPDF={() => exportVehiculosPDF(filtered)} onCSV={() => exportVehiculosCSV(filtered)} onXlsx={() => exportVehiculosXlsx(filtered)} />
          {canEdit && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Nuevo Vehículo
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Buscar placa, ficha, marca, chasis…"
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
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Ficha</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Matrícula</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Vehículo</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Dependencia</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Combustible</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No se encontraron vehículos.</td></tr>
                )}
                {filtered.map(v => {
                  const dep = dependencias.find(d => d.id === v.dependencia_id)
                  return (
                    <tr
                      key={v.id}
                      className={clsx('hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer', !v.activo && 'opacity-50')}
                      onClick={() => setDetailV(v)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-plate font-bold text-primary-600 text-base">{v.placa}</p>
                        {v.ficha_vieja && <p className="font-plate text-xs text-slate-400">{v.ficha_vieja}</p>}
                      </td>
                      <td className="px-4 py-3 font-plate text-slate-700 dark:text-slate-300 hidden sm:table-cell">{v.matricula ?? '—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{v.marca} {v.modelo}</p>
                        <p className="text-xs text-slate-400">{TIPO_ICON[v.tipo] ?? '⚙'} {v.tipo} · {v.anio}</p>
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
                      <td className="px-4 py-3"></td>
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
                {/* Ficha + status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Ficha</p>
                    <span className="font-plate font-bold text-primary-600 text-xl">{v.placa}</span>
                    {v.ficha_vieja && (
                      <span className="ml-2 text-xs text-slate-400 font-plate">({v.ficha_vieja})</span>
                    )}
                  </div>
                  <Badge variant={v.activo ? 'success' : 'neutral'}>
                    {v.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                {/* Matrícula */}
                {v.matricula && (
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Matrícula</p>
                    <p className="font-plate font-semibold text-slate-800 dark:text-slate-200">{v.matricula}</p>
                  </div>
                )}

                {/* Tipo + marca/modelo */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{TIPO_ICON[v.tipo] ?? '⚙'}</span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{v.marca} {v.modelo}</p>
                    <p className="text-xs text-slate-400">{v.anio} · {v.tipo}</p>
                  </div>
                </div>

                {/* Combustible */}
                <div className="flex items-center gap-2">
                  <Badge variant={COMBUSTIBLE_BADGE[v.combustible] ?? 'neutral'}>
                    <Fuel className="w-3 h-3 mr-1" />{v.combustible}
                  </Badge>
                </div>

                {/* Dependencia */}
                <p className="text-xs text-slate-400 truncate">{dep?.nombre ?? '—'}</p>

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
        canEdit={canEdit}
        onToggle={async () => { await toggleVehiculoActivo(detailV.id); setDetailV(null) }}
        onEdit={v => { setDetailV(null); openEdit(v) }}
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
          {/* Identificación */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Identificación</p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ficha Nueva *"
              placeholder="F-001"
              value={form.placa}
              onChange={e => field('placa', e.target.value.toUpperCase())}
              error={errors.placa}
              mono
            />
            <Input
              label="Ficha Vieja"
              placeholder="Ej: 234"
              value={form.ficha_vieja}
              onChange={e => field('ficha_vieja', e.target.value.toUpperCase())}
              mono
            />
            <Input
              label="Matrícula (Placa)"
              placeholder="A-123456"
              value={form.matricula}
              onChange={e => field('matricula', e.target.value.toUpperCase())}
              mono
            />
            <Input
              label="Chasis"
              placeholder="Número de chasis"
              value={form.chasis}
              onChange={e => field('chasis', e.target.value.toUpperCase())}
              mono
            />
          </div>
          {/* Datos del vehículo */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1">Datos del vehículo</p>
          <div className="grid grid-cols-2 gap-4">
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
              value={form.anio}
              onChange={e => field('anio', e.target.value)}
              error={errors.anio}
            />
            <Input
              label="Color"
              placeholder="Blanco"
              value={form.color}
              onChange={e => field('color', e.target.value)}
            />
            <div>
              <Select
                label="Tipo"
                value={TIPO_OPTIONS.includes(form.tipo) ? form.tipo : 'Otro'}
                onChange={e => field('tipo', e.target.value === 'Otro' ? 'Otro' : e.target.value)}
              >
                {TIPO_OPTIONS.map(t => <option key={t} value={t}>{TIPO_ICON[t]} {t}</option>)}
              </Select>
              {(!TIPO_OPTIONS.includes(form.tipo) || form.tipo === 'Otro') && (
                <Input
                  placeholder="Especifique el tipo…"
                  value={form.tipo === 'Otro' ? '' : form.tipo}
                  onChange={e => field('tipo', e.target.value)}
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>
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

function VehiculoDetailModal({ vehiculo, dependencias, despachos, productos, canEdit, onToggle, onEdit, onClose }) {
  const { confirm: askConfirm, ConfirmDialog } = useConfirm()
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
    <>
    <Modal open={!!vehiculo} onClose={onClose} title={`${vehiculo.placa} — ${vehiculo.marca} ${vehiculo.modelo}`} size="xl">
      <div className="p-6 space-y-5">
        {/* Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Field label="Ficha Nueva">
            <span className="font-plate font-bold text-primary-600 text-xl">{vehiculo.placa}</span>
          </Field>
          {vehiculo.ficha_vieja && (
            <Field label="Ficha Vieja">
              <span className="font-plate font-semibold text-slate-700 dark:text-slate-300">{vehiculo.ficha_vieja}</span>
            </Field>
          )}
          {vehiculo.matricula && (
            <Field label="Matrícula">
              <span className="font-plate font-semibold text-slate-800 dark:text-slate-200">{vehiculo.matricula}</span>
            </Field>
          )}
          {vehiculo.chasis && (
            <Field label="Chasis" value={vehiculo.chasis} />
          )}
          <Field label="Marca/Modelo" value={`${vehiculo.marca} ${vehiculo.modelo}`} />
          <Field label="Año" value={vehiculo.anio} />
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

        <div className="flex justify-between">
          {canEdit ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={() => { onClose(); onEdit(vehiculo) }}
              >
                Editar
              </Button>
              <Button
                variant={vehiculo.activo ? 'danger' : 'secondary'}
                icon={<Power className="w-4 h-4" />}
                onClick={async () => {
                  const ok = await askConfirm(`¿${vehiculo.activo ? 'Desactivar' : 'Activar'} vehículo ${vehiculo.placa}?`)
                  if (ok) onToggle()
                }}
              >
                {vehiculo.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </div>
          ) : <span />}
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
    {ConfirmDialog}
  </>
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
