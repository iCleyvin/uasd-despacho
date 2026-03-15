import { useState, useMemo, useEffect } from 'react'
import { Search, Download, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'

const PAGE_SIZE = 20

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

export default function Despachos() {
  const { despachos, vehiculos, productos, dependencias, usuarios, loadDespachos, loadUsuarios } = useData()

  useEffect(() => {
    loadDespachos()
    loadUsuarios()
  }, []) // eslint-disable-line

  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [filterVehiculo,   setFilterVehiculo]   = useState('')
  const [filterProducto,   setFilterProducto]   = useState('')
  const [filterNumero,     setFilterNumero]     = useState('')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(() => {
    return despachos.filter(d => {
      if (filterNumero) {
        const num = filterNumero.replace(/^#0*/, '')
        if (!String(d.id).includes(num)) return false
      }
      if (filterFechaDesde && d.fecha_despacho < filterFechaDesde) return false
      if (filterFechaHasta && d.fecha_despacho > filterFechaHasta + 'T23:59:59') return false
      if (filterProducto && d.producto_id !== Number(filterProducto)) return false
      if (filterVehiculo) {
        const v = vehiculos.find(v => v.id === d.vehiculo_id)
        if (!v) return false
        const q = filterVehiculo.toLowerCase()
        if (!v.placa.toLowerCase().includes(q) && !v.marca.toLowerCase().includes(q)) return false
      }
      return true
    }).sort((a, b) => b.fecha_despacho.localeCompare(a.fecha_despacho))
  }, [despachos, filterFechaDesde, filterFechaHasta, filterVehiculo, filterProducto, filterNumero, vehiculos])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function clearFilters() {
    setFilterFechaDesde('')
    setFilterFechaHasta('')
    setFilterVehiculo('')
    setFilterProducto('')
    setFilterNumero('')
    setPage(1)
  }

  function hasFilters() {
    return filterFechaDesde || filterFechaHasta || filterVehiculo || filterProducto || filterNumero
  }

  function exportCSV() {
    const headers = ['ID', 'Fecha/Hora', 'Placa', 'Marca', 'Modelo', 'Producto', 'Categoría', 'Cantidad', 'Unidad', 'Solicitado por', 'Cédula receptor', 'Km vehículo', 'Despachado por', 'Observaciones']
    const rows = filtered.map(d => {
      const v = vehiculos.find(v => v.id === d.vehiculo_id)
      const p = productos.find(p => p.id === d.producto_id)
      const u = usuarios.find(u => u.id === d.despachado_por)
      return [
        d.id,
        formatDateTime(d.fecha_despacho),
        v?.placa ?? '',
        v?.marca ?? '',
        v?.modelo ?? '',
        p?.nombre ?? '',
        CATEGORIA_LABELS[p?.categoria] ?? '',
        d.cantidad,
        d.unidad,
        d.solicitado_por,
        d.cedula_receptor ?? '',
        d.km_vehiculo ?? '',
        u ? `${u.nombre} ${u.apellido}` : '',
        d.observaciones ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `despachos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Historial de Despachos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Mostrando {paginated.length} de {filtered.length} despachos
          </p>
        </div>
        <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardBody className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label="N° Despacho"
              placeholder="#000001"
              value={filterNumero}
              onChange={e => { setFilterNumero(e.target.value); setPage(1) }}
              icon={<Search className="w-4 h-4" />}
              mono
            />
            <Input
              label="Desde"
              type="date"
              value={filterFechaDesde}
              onChange={e => { setFilterFechaDesde(e.target.value); setPage(1) }}
            />
            <Input
              label="Hasta"
              type="date"
              value={filterFechaHasta}
              onChange={e => { setFilterFechaHasta(e.target.value); setPage(1) }}
            />
            <Input
              label="Vehículo (placa/marca)"
              placeholder="Buscar…"
              value={filterVehiculo}
              onChange={e => { setFilterVehiculo(e.target.value); setPage(1) }}
              icon={<Search className="w-4 h-4" />}
            />
            <Select
              label="Producto"
              value={filterProducto}
              onChange={e => { setFilterProducto(e.target.value); setPage(1) }}
            >
              <option value="">Todos los productos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
          </div>
          {hasFilters() && (
            <button
              onClick={clearFilters}
              className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </CardBody>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha/Hora</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Vehículo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cantidad</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Receptor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Despachador</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">No hay despachos con los filtros seleccionados</td>
                </tr>
              )}
              {paginated.map(d => {
                const v = vehiculos.find(v => v.id === d.vehiculo_id)
                const p = productos.find(p => p.id === d.producto_id)
                const u = usuarios.find(u => u.id === d.despachado_por)
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setSelected(d)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600 whitespace-nowrap">#{String(d.id).padStart(6, '0')}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDateTime(d.fecha_despacho)}</td>
                    <td className="px-4 py-3">
                      <p className="font-plate font-bold text-primary-600">{v?.placa}</p>
                      <p className="text-xs text-slate-400">{v?.marca} {v?.modelo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{p?.nombre}</p>
                      <Badge variant={CATEGORIA_BADGE[p?.categoria] ?? 'neutral'} className="mt-0.5">
                        {CATEGORIA_LABELS[p?.categoria] ?? p?.categoria}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatNumber(d.cantidad, 0)} {d.unidad}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{d.solicitado_por}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                      {u ? `${u.nombre} ${u.apellido}` : `#${d.despachado_por}`}
                    </td>
                    <td className="px-4 py-3">
                      <Eye className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Modal detalle */}
      <DespachoModal
        despacho={selected}
        vehiculos={vehiculos}
        productos={productos}
        usuarios={usuarios}
        dependencias={dependencias}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

function DespachoModal({ despacho, vehiculos, productos, usuarios, dependencias, onClose }) {
  if (!despacho) return null
  const v   = vehiculos.find(v => v.id === despacho.vehiculo_id)
  const p   = productos.find(p => p.id === despacho.producto_id)
  const u   = usuarios.find(u => u.id === despacho.despachado_por)
  const dep = dependencias.find(d => d.id === v?.dependencia_id)

  return (
    <Modal open={!!despacho} onClose={onClose} title={`Despacho #${String(despacho.id).padStart(6, '0')}`} size="md">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Fecha y hora" value={formatDateTime(despacho.fecha_despacho)} />
          <Field label="Vehículo">
            <span className="font-plate font-bold text-primary-600 text-base">{v?.placa}</span>
            <span className="block text-xs text-slate-500">{v?.marca} {v?.modelo} ({v?.año})</span>
          </Field>
          <Field label="Dependencia" value={dep?.nombre ?? '—'} />
          <Field label="Tipo" value={v?.tipo ?? '—'} />
          <Field label="Producto">
            <span className="font-medium">{p?.nombre}</span>
            <Badge variant={CATEGORIA_BADGE[p?.categoria] ?? 'neutral'} className="ml-2">
              {CATEGORIA_LABELS[p?.categoria]}
            </Badge>
          </Field>
          <Field label="Cantidad">
            <span className="font-bold text-lg text-primary-600">{formatNumber(despacho.cantidad, 0)}</span>
            <span className="text-slate-500 ml-1 text-xs">{despacho.unidad}</span>
          </Field>
          <Field label="Solicitado por" value={despacho.solicitado_por} />
          <Field label="Despachado por" value={u ? `${u.nombre} ${u.apellido}` : `#${despacho.despachado_por}`} />
          {despacho.cedula_receptor && (
            <Field label="Cédula receptor">
              <span className="font-plate">{despacho.cedula_receptor}</span>
            </Field>
          )}
          {despacho.km_vehiculo && (
            <Field label="Km vehículo" value={`${formatNumber(despacho.km_vehiculo, 0)} km`} />
          )}
          {despacho.observaciones && (
            <div className="col-span-2">
              <Field label="Observaciones" value={despacho.observaciones} />
            </div>
          )}
        </div>
        <div className="flex justify-end pt-2">
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
