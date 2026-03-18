import { useState, useEffect, useCallback } from 'react'
import { Search, Download, ChevronLeft, ChevronRight, X, Eye, Loader2, Printer } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import AccessDenied from '../components/ui/AccessDenied'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import ExportMenu from '../components/ui/ExportMenu'
import { exportDespachosPDF, exportDespachoIndividualPDF } from '../lib/exportPdf'

const PAGE_SIZE = 20

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

export default function Despachos() {
  const { productos } = useData()
  const { user, hasPermiso } = useAuth()

  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [page,    setPage]    = useState(1)
  const [selected, setSelected] = useState(null)
  const [exporting, setExporting] = useState(false)

  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [filterQ,          setFilterQ]          = useState('')
  const [filterProducto,   setFilterProducto]   = useState('')
  const [filterNumero,     setFilterNumero]      = useState('')

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const buildParams = useCallback((p = page) => {
    const params = { page: p, limit: PAGE_SIZE }
    if (filterFechaDesde) params.fecha_desde  = filterFechaDesde
    if (filterFechaHasta) params.fecha_hasta  = filterFechaHasta
    if (filterQ.trim())   params.q            = filterQ.trim()
    if (filterProducto)   params.producto_id  = filterProducto
    if (filterNumero.replace(/^#?0*/, ''))
      params.despacho_id = filterNumero.replace(/^#?0*/, '')
    return params
  }, [page, filterFechaDesde, filterFechaHasta, filterQ, filterProducto, filterNumero])

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/despachos?' + new URLSearchParams(buildParams(p)))
      setRows(res.data)
      setTotal(res.total)
      setPage(p)
    } catch { /* error manejado por api.js */ }
    finally { setLoading(false) }
  }, [buildParams])

  // Refetch al montar y cuando cambian los filtros (con debounce para q)
  useEffect(() => { fetchData(1) }, [filterFechaDesde, filterFechaHasta, filterProducto, filterNumero]) // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 350)
    return () => clearTimeout(t)
  }, [filterQ]) // eslint-disable-line

  if (!hasPermiso('despachos.ver')) return <AccessDenied />

  function handlePage(p) { fetchData(p) }

  function filterHoy() {
    const hoy = new Date().toISOString().slice(0, 10)
    setFilterFechaDesde(hoy)
    setFilterFechaHasta(hoy)
    setFilterNumero('')
    setFilterQ('')
    setFilterProducto('')
  }

  function clearFilters() {
    setFilterFechaDesde('')
    setFilterFechaHasta('')
    setFilterQ('')
    setFilterProducto('')
    setFilterNumero('')
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const isHoy = filterFechaDesde === hoy && filterFechaHasta === hoy
  const hasFilters = filterFechaDesde || filterFechaHasta || filterQ || filterProducto || filterNumero

  async function exportCSV() {
    setExporting(true)
    try {
      const qs = new URLSearchParams(buildParams(1))
      qs.delete('page'); qs.delete('limit')
      const response = await fetch(`/api/despachos/export?${qs}`, { credentials: 'include' })
      if (!response.ok) throw new Error('Error al exportar')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `despachos_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  async function exportPDF() {
    setExporting(true)
    try {
      const qs = new URLSearchParams(buildParams(1))
      qs.delete('page'); qs.delete('limit')
      qs.set('limit', '9999')
      const res = await api.get('/despachos?' + qs)
      exportDespachosPDF(res.data)
    } catch { /* silent */ }
    finally { setExporting(false) }
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Historial de Despachos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {loading ? 'Cargando…' : `${total.toLocaleString()} despacho${total !== 1 ? 's' : ''} encontrados`}
          </p>
        </div>
        <ExportMenu onPDF={exportPDF} onCSV={exportCSV} loading={exporting} disabled={total === 0} />
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardBody className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label="N° Despacho"
              placeholder="#000001"
              value={filterNumero}
              onChange={e => setFilterNumero(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              mono
            />
            <Input
              label="Desde"
              type="date"
              value={filterFechaDesde}
              onChange={e => setFilterFechaDesde(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={filterFechaHasta}
              onChange={e => setFilterFechaHasta(e.target.value)}
            />
            <Input
              label="Vehículo / Receptor"
              placeholder="Placa, marca, nombre…"
              value={filterQ}
              onChange={e => setFilterQ(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            <Select
              label="Producto"
              value={filterProducto}
              onChange={e => setFilterProducto(e.target.value)}
            >
              <option value="">Todos los productos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </Select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={filterHoy}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isHoy
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              Hoy
            </button>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>
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
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Cargando…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">No hay despachos con los filtros seleccionados</td>
                </tr>
              )}
              {rows.map(d => (
                <tr
                  key={d.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(d)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-600 whitespace-nowrap">#{String(d.id).padStart(6, '0')}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDateTime(d.fecha_despacho)}</td>
                  <td className="px-4 py-3">
                    <p className="font-plate font-bold text-primary-600">{d.placa}</p>
                    <p className="text-xs text-slate-400">{d.marca} {d.modelo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{d.producto_nombre}</p>
                    <Badge variant={CATEGORIA_BADGE[d.categoria] ?? 'neutral'} className="mt-0.5">
                      {CATEGORIA_LABELS[d.categoria] ?? d.categoria}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {formatNumber(d.cantidad, 0)} {d.unidad}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{d.solicitado_por}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">{d.despachador_nombre}</td>
                  <td className="px-4 py-3"><Eye className="w-4 h-4 text-slate-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <Button variant="secondary" size="sm" icon={<ChevronLeft className="w-4 h-4" />}
              disabled={page === 1 || loading} onClick={() => handlePage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page === totalPages || loading}
              onClick={() => handlePage(page + 1)}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Modal detalle */}
      <DespachoModal despacho={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function DespachoModal({ despacho, onClose }) {
  const [printing, setPrinting] = useState(false)
  if (!despacho) return null

  async function handlePrint() {
    setPrinting(true)
    try { await exportDespachoIndividualPDF(despacho) }
    finally { setPrinting(false) }
  }

  return (
    <Modal open={!!despacho} onClose={onClose} title={`Despacho #${String(despacho.id).padStart(6, '0')}`} size="md">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Fecha y hora"   value={formatDateTime(despacho.fecha_despacho)} />
          <Field label="Vehículo">
            <span className="font-plate font-bold text-primary-600 text-base">{despacho.placa}</span>
            <span className="block text-xs text-slate-500">{despacho.marca} {despacho.modelo}</span>
          </Field>
          <Field label="Dependencia"    value={despacho.dependencia_nombre ?? '—'} />
          <Field label="Tipo"           value={despacho.vehiculo_tipo ?? '—'} />
          <Field label="Producto">
            <span className="font-medium">{despacho.producto_nombre}</span>
            <Badge variant={CATEGORIA_BADGE[despacho.categoria] ?? 'neutral'} className="ml-2">
              {CATEGORIA_LABELS[despacho.categoria]}
            </Badge>
          </Field>
          <Field label="Cantidad">
            <span className="font-bold text-lg text-primary-600">{formatNumber(despacho.cantidad, 0)}</span>
            <span className="text-slate-500 ml-1 text-xs">{despacho.unidad}</span>
          </Field>
          <Field label="Solicitado por" value={despacho.solicitado_por} />
          <Field label="Despachado por" value={despacho.despachador_nombre} />
          {despacho.cedula_receptor && (
            <Field label="Cédula receptor"><span className="font-plate">{despacho.cedula_receptor}</span></Field>
          )}
          {despacho.km_vehiculo && (
            <Field label="Km vehículo" value={`${formatNumber(despacho.km_vehiculo, 0)} km`} />
          )}
          {despacho.observaciones && (
            <div className="col-span-2"><Field label="Observaciones" value={despacho.observaciones} /></div>
          )}
        </div>
        <div className="flex justify-between pt-2">
          <Button
            variant="primary"
            icon={printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            onClick={handlePrint}
            disabled={printing}
          >
            {printing ? 'Generando…' : 'Imprimir comprobante'}
          </Button>
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
