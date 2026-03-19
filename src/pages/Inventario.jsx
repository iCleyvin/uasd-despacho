import { useState, useCallback, useEffect, useRef } from 'react'
import { useConfirm } from '../hooks/useConfirm'
import { Plus, Package, Power, Edit2, LayoutGrid, List, Upload, History, ArrowDownToLine, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Eye, Printer, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardBody } from '../components/ui/Card'
import AccessDenied from '../components/ui/AccessDenied'
import ExportMenu from '../components/ui/ExportMenu'
import { exportInventarioPDF, exportMovimientoPDF, exportMovimientosPDF } from '../lib/exportPdf'
import { exportInventarioCSV, exportMovimientosCSV } from '../lib/exportCsv'
import { exportInventarioXlsx } from '../lib/exportXlsx'

const CATEGORIAS = ['combustible', 'aceite_motor', 'aceite_transmision', 'repuesto', 'otro']

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

const EMPTY_PROD_FORM = { nombre: '', categoria: 'combustible', categoriaCustom: '', unidad: '', stock_minimo: '', precio_unitario: '' }

const CSV_TEMPLATE_HEADERS = 'nombre,categoria,unidad,stock_minimo,precio_unitario,stock_inicial'
const CSV_TEMPLATE_EXAMPLE = [
  'Gasolina Regular,combustible,galones,100,280,450',
  'Aceite Motor 20W-50,aceite_motor,cuartos,50,350,120',
  'Filtro de Aceite,repuesto,unidad,10,180,25',
].join('\n')

function prodFormFromProducto(p) {
  const isCustom = !CATEGORIAS.includes(p.categoria)
  return {
    nombre:          p.nombre,
    categoria:       isCustom ? 'otro' : p.categoria,
    categoriaCustom: isCustom ? p.categoria : '',
    unidad:          p.unidad,
    stock_minimo:    String(p.stock_minimo),
    precio_unitario: String(p.precio_unitario),
  }
}

function stockVariant(p) {
  const actual = Number(p.stock_actual), min = Number(p.stock_minimo)
  if (actual <= 0) return 'danger'
  if (actual <= min) return 'danger'
  if (actual <= min * 2) return 'warning'
  return 'success'
}

function stockLabel(p) {
  const actual = Number(p.stock_actual), min = Number(p.stock_minimo)
  if (actual <= 0) return 'Sin stock'
  if (actual <= min) return 'Crítico'
  if (actual <= min * 2) return 'Bajo'
  return 'OK'
}

function StockBar({ producto }) {
  const actual = Number(producto.stock_actual), min = Number(producto.stock_minimo)
  const max = min * 4
  const pct = Math.min(100, max > 0 ? (actual / max) * 100 : 0)
  const color = stockVariant(producto)
  const barClass = { success: 'bg-green-500', warning: 'bg-amber-400', danger: 'bg-red-500', neutral: 'bg-slate-400' }[color]
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
    </div>
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

// ── Parse CSV ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [], error: 'El archivo debe tener al menos una fila de datos además del encabezado.' }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const required = ['nombre', 'categoria', 'unidad', 'stock_minimo', 'precio_unitario']
  const missing = required.filter(r => !headers.includes(r))
  if (missing.length > 0) return { headers: [], rows: [], error: `Columnas faltantes: ${missing.join(', ')}` }

  const rows = lines.slice(1).map((line, i) => {
    const vals = line.split(',').map(v => v.trim())
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? '' })
    obj._fila = i + 2

    const errs = []
    if (!obj.nombre)                                         errs.push('nombre requerido')
    if (!obj.categoria)                                      errs.push('categoría requerida')
    if (!obj.unidad)                                         errs.push('unidad requerida')
    if (obj.stock_minimo    === '' || isNaN(Number(obj.stock_minimo)))    errs.push('stock_minimo inválido')
    if (obj.precio_unitario === '' || isNaN(Number(obj.precio_unitario))) errs.push('precio_unitario inválido')
    if (obj.stock_inicial !== undefined && obj.stock_inicial !== '' && isNaN(Number(obj.stock_inicial))) errs.push('stock_inicial inválido')
    obj._errores = errs
    return obj
  })

  return { headers, rows, error: null }
}

function downloadTemplate() {
  const content = CSV_TEMPLATE_HEADERS + '\n' + CSV_TEMPLATE_EXAMPLE
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_inventario.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Import Modal ──────────────────────────────────────────────────────────────
function ImportModal({ open, onClose, onImport }) {
  const fileRef = useRef(null)
  const [parsed,    setParsed]    = useState(null)
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)
  const [dragOver,  setDragOver]  = useState(false)
  const [parseErr,  setParseErr]  = useState(null)

  function reset() {
    setParsed(null)
    setResult(null)
    setParseErr(null)
    setImporting(false)
  }

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { headers, rows, error } = parseCSV(e.target.result)
      if (error) { setParseErr(error); setParsed(null) } else { setParsed({ headers, rows }); setParseErr(null) }
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleImport() {
    if (!parsed) return
    const validRows = parsed.rows.filter(r => r._errores.length === 0)
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const items = validRows.map(r => ({
        nombre:          r.nombre,
        categoria:       r.categoria,
        unidad:          r.unidad,
        stock_minimo:    Number(r.stock_minimo),
        precio_unitario: Number(r.precio_unitario),
        stock_inicial:   r.stock_inicial ? Number(r.stock_inicial) : 0,
      }))
      const res = await onImport(items)
      setResult(res)
    } catch (err) {
      setParseErr(err?.message ?? 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  const validCount   = parsed?.rows.filter(r => r._errores.length === 0).length ?? 0
  const invalidCount = parsed?.rows.filter(r => r._errores.length >  0).length ?? 0

  return (
    <Modal open={open} onClose={handleClose} title="Importar productos desde CSV" size="lg">
      <div className="p-6 space-y-5">

        {/* Estado: resultado final */}
        {result && (
          <div className="space-y-4">
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-sm">
              <p className="font-semibold text-green-800 dark:text-green-300 mb-2">Importación completada</p>
              <ul className="space-y-1 text-green-700 dark:text-green-400">
                <li>✅ Productos creados: <strong>{result.creados}</strong></li>
                <li>ℹ️ Productos ya existentes (sin cambios): <strong>{result.existentes}</strong></li>
                {result.errores?.length > 0 && (
                  <li>⚠️ Filas con error: <strong>{result.errores.length}</strong></li>
                )}
              </ul>
            </div>
            {result.errores?.length > 0 && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs">
                <p className="font-semibold text-red-700 dark:text-red-400 mb-1">Errores del servidor:</p>
                {result.errores.map((e, i) => (
                  <p key={i} className="text-red-600 dark:text-red-400">Fila {e.fila}: {e.error}</p>
                ))}
              </div>
            )}
            <Button variant="primary" className="w-full" onClick={handleClose}>Cerrar</Button>
          </div>
        )}

        {/* Estado: sin resultado todavía */}
        {!result && (
          <>
            {/* Descargar plantilla */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Plantilla CSV</p>
                <p className="text-xs text-slate-400">Descarga y completa la plantilla para importar.</p>
              </div>
              <Button size="sm" variant="secondary" icon={<ArrowDownToLine className="w-3.5 h-3.5" />} onClick={downloadTemplate}>
                Descargar
              </Button>
            </div>

            {/* Columnas */}
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
              <p className="font-medium text-slate-600 dark:text-slate-300 mb-1">Columnas del CSV:</p>
              <p><code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">nombre</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">categoria</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">unidad</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">stock_minimo</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">precio_unitario</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">stock_inicial</code> (opcional)</p>
              <p>Categorías: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">combustible</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">aceite_motor</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">aceite_transmision</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">repuesto</code> · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">otro</code></p>
            </div>

            {/* Drop zone */}
            {!parsed && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Arrastra un archivo CSV aquí o haz clic para seleccionar</p>
                <p className="text-xs text-slate-400 mt-1">Máximo 500 filas</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              </div>
            )}

            {/* Error de parseo */}
            {parseErr && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                {parseErr}
              </div>
            )}

            {/* Preview */}
            {parsed && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> {validCount} válidas
                    </span>
                    {invalidCount > 0 && (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                        <XCircle className="w-4 h-4" /> {invalidCount} con error
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="secondary" onClick={reset}>Cambiar archivo</Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Fila</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Categoría</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Unidad</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">Stk. mín.</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">Precio</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">Stk. ini.</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {parsed.rows.map(row => (
                        <tr key={row._fila} className={row._errores.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                          <td className="px-3 py-2 text-slate-400">{row._fila}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.nombre}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.categoria}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{row.unidad}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{row.stock_minimo}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{row.precio_unitario}</td>
                          <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400">{row.stock_inicial || '—'}</td>
                          <td className="px-3 py-2">
                            {row._errores.length > 0
                              ? <span className="text-red-600 dark:text-red-400">{row._errores.join(', ')}</span>
                              : <span className="text-green-600 dark:text-green-400">OK</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={handleClose}>Cancelar</Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    loading={importing}
                    disabled={validCount === 0}
                    onClick={handleImport}
                  >
                    Importar {validCount} fila{validCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetailModal({ producto, auditoria, canEdit, onEntrada, onEdit, onToggle, onClose }) {
  const { confirm: askConfirm, ConfirmDialog } = useConfirm()
  if (!producto) return null

  const movimientos = auditoria
    .filter(a => a.tabla === 'productos' && a.registro_id === producto.id)
    .slice(0, 8)

  const variant = stockVariant(producto)

  return (
    <>
    <Modal open={!!producto} onClose={onClose} title={`${producto.nombre}`} size="lg">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Field label="ID">
            <span className="font-mono font-bold text-slate-500 dark:text-slate-400">#{producto.id}</span>
          </Field>
          <Field label="Categoría">
            <Badge variant={CATEGORIA_BADGE[producto.categoria] ?? 'neutral'}>
              {CATEGORIA_LABELS[producto.categoria] ?? producto.categoria}
            </Badge>
          </Field>
          <Field label="Unidad" value={producto.unidad} />
          <Field label="Stock mínimo" value={`${formatNumber(producto.stock_minimo, 2)} ${producto.unidad}`} />
          <Field label="Precio unitario" value={`RD$ ${formatNumber(producto.precio_unitario, 2)}`} />
          <Field label="Estado">
            <Badge variant={producto.activo !== false ? 'success' : 'neutral'}>
              {producto.activo !== false ? 'Activo' : 'Inactivo'}
            </Badge>
          </Field>
          <Field label="Stock actual">
            <span className={clsx(
              'text-2xl font-bold leading-none',
              variant === 'danger' ? 'text-red-500' :
              variant === 'warning' ? 'text-amber-500' : 'text-green-600'
            )}>
              {formatNumber(producto.stock_actual, 0)}
              <span className="text-sm font-normal text-slate-500 ml-1">{producto.unidad}</span>
            </span>
          </Field>
        </div>

        <div className="pt-1">
          <StockBar producto={producto} />
          <p className="text-xs text-slate-400 mt-1">
            Mínimo: {producto.stock_minimo} {producto.unidad} · Estado: <span className={
              variant === 'danger' ? 'text-red-500 font-medium' :
              variant === 'warning' ? 'text-amber-500 font-medium' : 'text-green-600 font-medium'
            }>{stockLabel(producto)}</span>
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Últimos movimientos</h3>
          {movimientos.length === 0 ? (
            <p className="text-sm text-slate-400">Sin movimientos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 text-left">
                  <th className="pb-1 font-medium">Fecha</th>
                  <th className="pb-1 font-medium">Acción</th>
                  <th className="pb-1 font-medium text-right">Antes</th>
                  <th className="pb-1 font-medium text-right">Después</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {movimientos.map(m => (
                  <tr key={m.id}>
                    <td className="py-1.5 text-slate-500">{formatDateTime(m.created_at)}</td>
                    <td className="py-1.5">
                      <Badge variant={m.accion === 'ENTRADA' ? 'success' : 'neutral'}>
                        {m.accion === 'ENTRADA' ? 'Entrada' : 'Despacho'}
                      </Badge>
                    </td>
                    <td className="py-1.5 text-right text-slate-500">{m.datos_antes?.stock_actual ?? '—'}</td>
                    <td className="py-1.5 text-right font-medium text-slate-800 dark:text-slate-200">{m.datos_nuevo?.stock_actual ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          {canEdit && (
            <Button
              size="sm"
              variant={producto.activo !== false ? 'danger' : 'secondary'}
              icon={<Power className="w-3.5 h-3.5" />}
              onClick={async () => {
                const ok = await askConfirm(`¿${producto.activo !== false ? 'Desactivar' : 'Activar'} el producto "${producto.nombre}"?`)
                if (ok) onToggle()
              }}
            >
              {producto.activo !== false ? 'Desactivar' : 'Activar'}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            {canEdit && (
              <>
                <Button size="sm" variant="secondary" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => { onClose(); onEdit(producto) }}>
                  Editar
                </Button>
                <Button size="sm" variant="primary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { onClose(); onEntrada(producto) }} disabled={producto.activo === false}>
                  Entrada
                </Button>
              </>
            )}
            <Button size="sm" variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>
    </Modal>
    {ConfirmDialog}
    </>
  )
}

// ── Historial de movimientos ──────────────────────────────────────────────────
const HIST_PAGE_SIZE = 30

function HistorialView({ productos }) {
  const { loadMovimientos } = useData()

  const [rows,        setRows]        = useState([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [loaded,      setLoaded]      = useState(false)
  const [exporting,   setExporting]   = useState(false)

  const [filtProd,    setFiltProd]    = useState('')
  const [filtTipo,    setFiltTipo]    = useState('')
  const [filtDesde,   setFiltDesde]   = useState('')
  const [filtHasta,   setFiltHasta]   = useState('')
  const [selected,    setSelected]    = useState(null)

  const fetchPage = useCallback(async (p, fProd, fTipo, fDesde, fHasta) => {
    setLoading(true)
    try {
      const params = { page: p, limit: HIST_PAGE_SIZE }
      if (fProd)  params.producto_id = fProd
      if (fTipo)  params.tipo        = fTipo
      if (fDesde) params.fecha_desde = fDesde
      if (fHasta) params.fecha_hasta = fHasta
      const res = await loadMovimientos(params)
      setRows(res.data)
      setTotal(res.total)
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [loadMovimientos])

  // Cargar al montar
  useEffect(() => { fetchPage(1, '', '', '', '') }, [fetchPage])

  function applyFilters() {
    setPage(1)
    fetchPage(1, filtProd, filtTipo, filtDesde, filtHasta)
  }

  function clearFilters() {
    setFiltProd(''); setFiltTipo(''); setFiltDesde(''); setFiltHasta('')
    setPage(1)
    fetchPage(1, '', '', '', '')
  }

  function goPage(p) {
    setPage(p)
    fetchPage(p, filtProd, filtTipo, filtDesde, filtHasta)
  }

  async function fetchAllForExport() {
    const params = { limit: 5000, page: 1 }
    if (filtProd)  params.producto_id = filtProd
    if (filtTipo)  params.tipo        = filtTipo
    if (filtDesde) params.fecha_desde = filtDesde
    if (filtHasta) params.fecha_hasta = filtHasta
    const res = await loadMovimientos(params)
    return res.data
  }

  async function handleExportCSV() {
    setExporting(true)
    try { exportMovimientosCSV(await fetchAllForExport()) }
    finally { setExporting(false) }
  }

  async function handleExportPDF() {
    setExporting(true)
    try { await exportMovimientosPDF(await fetchAllForExport()) }
    finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / HIST_PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Producto</label>
              <Select value={filtProd} onChange={e => setFiltProd(e.target.value)}>
                <option value="">Todos</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tipo</label>
              <Select value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="despacho">Despacho</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Desde</label>
              <input
                type="date"
                value={filtDesde}
                onChange={e => setFiltDesde(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Hasta</label>
              <input
                type="date"
                value={filtHasta}
                onChange={e => setFiltHasta(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={applyFilters} loading={loading}>Filtrar</Button>
              <Button size="sm" variant="secondary" onClick={clearFilters}>Limpiar</Button>
            </div>
            <ExportMenu onPDF={handleExportPDF} onCSV={handleExportCSV} loading={exporting} disabled={total === 0} />
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        {loading && !loaded ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Sin movimientos para los filtros seleccionados.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cantidad</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Stock antes</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Stock después</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Vehículo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Usuario</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Notas</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {rows.map((r, i) => (
                    <tr key={`${r.tipo}-${r.id}-${i}`} onClick={() => setSelected(r)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.tipo === 'entrada' ? 'success' : 'info'}>
                          {r.tipo === 'entrada' ? 'Entrada' : 'Despacho'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{r.producto_nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx(
                          'font-bold',
                          r.tipo === 'entrada' ? 'text-green-600' : 'text-blue-600 dark:text-blue-400'
                        )}>
                          {r.tipo === 'entrada' ? '+' : '−'}{formatNumber(r.cantidad, 0)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{r.unidad}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                        {r.stock_antes != null ? formatNumber(r.stock_antes, 0) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-medium hidden sm:table-cell">
                        {r.stock_despues != null ? formatNumber(r.stock_despues, 0) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {r.vehiculo_placa
                          ? <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{r.vehiculo_placa}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{r.usuario_nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell max-w-[160px] truncate">{r.notas || '—'}</td>
                      <td className="px-4 py-3"><Eye className="w-4 h-4 text-slate-400" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500">
                  {(page - 1) * HIST_PAGE_SIZE + 1}–{Math.min(page * HIST_PAGE_SIZE, total)} de {total} movimientos
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goPage(page - 1)}
                    disabled={page === 1 || loading}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-600 dark:text-slate-400 px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => goPage(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <MovimientoModal movimiento={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function MovimientoModal({ movimiento: m, onClose }) {
  const [printing, setPrinting] = useState(false)
  const [printErr, setPrintErr] = useState(null)

  useEffect(() => { if (!m) setPrintErr(null) }, [m])

  if (!m) return null

  const esEntrada = m.tipo === 'entrada'

  async function handlePrint() {
    setPrinting(true)
    setPrintErr(null)
    try { await exportMovimientoPDF(m) }
    catch (err) { setPrintErr(err.message ?? 'Error al generar PDF') }
    finally { setPrinting(false) }
  }

  return (
    <Modal
      open={!!m}
      onClose={onClose}
      title={esEntrada ? 'Detalle de Entrada' : 'Detalle de Despacho'}
      size="md"
    >
      <div className="p-6 space-y-4">
        {/* Badge tipo */}
        <div className="flex items-center gap-2">
          <Badge variant={esEntrada ? 'success' : 'info'}>
            {esEntrada ? 'Entrada de inventario' : 'Despacho'}
          </Badge>
          <span className="text-xs text-slate-400">{new Date(m.fecha).toLocaleString('es-DO')}</span>
        </div>

        {/* Detalles */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="col-span-2">
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Producto</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{m.producto_nombre}</p>
          </div>

          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Cantidad</p>
            <p className={`font-bold text-xl leading-none ${esEntrada ? 'text-green-600' : 'text-blue-600 dark:text-blue-400'}`}>
              {esEntrada ? '+' : '−'}{formatNumber(m.cantidad, 0)}
              <span className="text-xs font-normal text-slate-400 ml-1">{m.unidad}</span>
            </p>
          </div>

          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Registrado por</p>
            <p className="text-slate-800 dark:text-slate-200">{m.usuario_nombre ?? '—'}</p>
          </div>

          {esEntrada ? (
            <>
              <div>
                <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Stock anterior</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {m.stock_antes != null ? `${formatNumber(m.stock_antes, 0)} ${m.unidad}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Stock después</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {m.stock_despues != null ? `${formatNumber(m.stock_despues, 0)} ${m.unidad}` : '—'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Vehículo</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-100">{m.vehiculo_placa ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Solicitado por</p>
                <p className="text-slate-800 dark:text-slate-200">{m.solicitado_por ?? '—'}</p>
              </div>
            </>
          )}

          {m.notas && (
            <div className="col-span-2">
              <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Notas</p>
              <p className="text-slate-700 dark:text-slate-300 text-sm">{m.notas}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          {printErr
            ? <p className="text-xs text-red-500">⚠ {printErr}</p>
            : <span />}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
            <Button
              variant="primary"
              size="sm"
              icon={printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              disabled={printing}
              onClick={handlePrint}
            >
              {printing ? 'Generando…' : 'Imprimir'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Inventario() {
  const { productos, auditoria, registrarEntrada, crearProducto, editarProducto, toggleProductoActivo, importarProductos } = useData()
  const { hasPermiso } = useAuth()
  const canEdit = hasPermiso('inventario.editar')

  // Tabs
  const [activeTab, setActiveTab] = useState('productos') // 'productos' | 'historial'

  // Detail modal
  const [detailProd, setDetailProd] = useState(null)

  // Entrada modal
  const [modalOpen,  setModalOpen]  = useState(false)
  const [modalProd,  setModalProd]  = useState(null)
  const [cantidad,   setCantidad]   = useState('')
  const [notas,      setNotas]      = useState('')
  const [cantError,  setCantError]  = useState('')
  const [saving,     setSaving]     = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [viewMode, setViewMode] = useState('grid')

  // Create/Edit modal
  const [formOpen,    setFormOpen]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [formData,    setFormData]    = useState(EMPTY_PROD_FORM)
  const [formErrors,  setFormErrors]  = useState({})
  const [formSaving,  setFormSaving]  = useState(false)

  // Import modal
  const [importOpen, setImportOpen] = useState(false)

  if (!hasPermiso('inventario.ver')) return <AccessDenied />

  const lowStock = productos.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo) && p.activo !== false)

  function openEntrada(p) {
    setModalProd(p)
    setCantidad('')
    setNotas('')
    setCantError('')
    setSuccessMsg('')
    setModalOpen(true)
  }

  async function handleEntrada(e) {
    e.preventDefault()
    if (!cantidad || Number(cantidad) <= 0) { setCantError('Ingrese una cantidad válida'); return }
    setSaving(true)
    try {
      await registrarEntrada(modalProd.id, Number(cantidad), notas)
      setSuccessMsg(`Se registraron ${cantidad} ${modalProd.unidad} de ${modalProd.nombre}`)
      setTimeout(() => setModalOpen(false), 1200)
    } catch (err) {
      setCantError(err?.response?.data?.error ?? err?.message ?? 'Error al registrar entrada')
    } finally {
      setSaving(false)
    }
  }

  function openCreate() {
    setEditTarget(null)
    setFormData(EMPTY_PROD_FORM)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(p) {
    setEditTarget(p)
    setFormData(prodFormFromProducto(p))
    setFormErrors({})
    setFormOpen(true)
  }

  function fField(key, val) {
    setFormData(f => ({ ...f, [key]: val }))
    setFormErrors(e => ({ ...e, [key]: undefined }))
  }

  function validateForm() {
    const e = {}
    if (!formData.nombre.trim())       e.nombre = 'Campo requerido'
    if (formData.categoria === 'otro' && !formData.categoriaCustom.trim()) e.categoriaCustom = 'Especifique la categoría'
    if (!formData.unidad.trim())       e.unidad = 'Campo requerido'
    if (formData.stock_minimo === '' || Number(formData.stock_minimo) < 0) e.stock_minimo = 'Debe ser ≥ 0'
    if (formData.precio_unitario === '' || Number(formData.precio_unitario) < 0) e.precio_unitario = 'Debe ser ≥ 0'
    return e
  }

  async function handleFormSave(e) {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setFormSaving(true)
    const categoriaFinal = formData.categoria === 'otro'
      ? formData.categoriaCustom.trim().toLowerCase().replace(/\s+/g, '_')
      : formData.categoria
    const payload = {
      nombre:          formData.nombre.trim(),
      categoria:       categoriaFinal,
      unidad:          formData.unidad.trim(),
      stock_minimo:    Number(formData.stock_minimo),
      precio_unitario: Number(formData.precio_unitario),
    }
    try {
      if (editTarget) {
        await editarProducto(editTarget.id, payload)
      } else {
        await crearProducto(payload)
      }
      setFormOpen(false)
    } catch (err) {
      setFormErrors({ nombre: err?.response?.data?.error ?? err?.message ?? 'Error al guardar' })
    } finally {
      setFormSaving(false)
    }
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Inventario</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {productos.filter(p => p.activo !== false).length} productos activos
            {lowStock.length > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                · {lowStock.length} con stock bajo o crítico
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'productos' && (
            <>
              <ExportMenu onPDF={() => exportInventarioPDF(productos)} onCSV={() => exportInventarioCSV(productos)} onXlsx={() => exportInventarioXlsx(productos)} />
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={clsx('p-2 transition-colors', viewMode === 'grid' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700')}
                  title="Vista cuadrícula"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={clsx('p-2 transition-colors', viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700')}
                  title="Vista lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {canEdit && (
                <>
                  <Button variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => setImportOpen(true)}>
                    Importar CSV
                  </Button>
                  <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                    Nuevo Producto
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('productos')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'productos'
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <Package className="w-4 h-4" />
          Productos
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'historial'
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          <History className="w-4 h-4" />
          Historial de movimientos
        </button>
      </div>

      {/* Tab: Productos */}
      {activeTab === 'productos' && (
        <>
          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                ⚠ Productos con stock bajo o crítico: {lowStock.map(p => p.nombre).join(', ')}
              </p>
            </div>
          )}

          {/* Grid */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {productos.map(p => {
                const variant = stockVariant(p)
                return (
                  <Card
                    key={p.id}
                    className={clsx('overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow', !p.activo && 'opacity-60')}
                    onClick={() => setDetailProd(p)}
                  >
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-primary-600 shrink-0" />
                            <Badge variant={CATEGORIA_BADGE[p.categoria] ?? 'neutral'}>
                              {CATEGORIA_LABELS[p.categoria] ?? p.categoria}
                            </Badge>
                            {!p.activo && <Badge variant="neutral">Inactivo</Badge>}
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">{p.nombre}</h3>
                        </div>
                        <Badge variant={variant}>{stockLabel(p)}</Badge>
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className={clsx(
                          'text-3xl font-bold leading-none',
                          variant === 'danger' ? 'text-red-500' :
                          variant === 'warning' ? 'text-amber-500' : 'text-green-600'
                        )}>
                          {formatNumber(p.stock_actual, 0)}
                        </span>
                        <span className="text-sm text-slate-500 mb-0.5">{p.unidad}</span>
                      </div>
                      <StockBar producto={p} />
                      <p className="text-xs text-slate-400 mt-1.5 mb-3">Mínimo: {p.stock_minimo} {p.unidad}</p>
                      {canEdit && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<Plus className="w-4 h-4" />}
                          onClick={e => { e.stopPropagation(); openEntrada(p) }}
                          className="w-full mt-auto"
                          disabled={!p.activo}
                        >
                          Registrar Entrada
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Lista */}
          {viewMode === 'list' && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Nombre</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Categoría</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock actual</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Stock mínimo</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden md:table-cell">Unidad</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden lg:table-cell">Precio unit.</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {productos.map(p => {
                      const variant = stockVariant(p)
                      return (
                        <tr
                          key={p.id}
                          className={clsx('hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors', !p.activo && 'opacity-60')}
                          onClick={() => setDetailProd(p)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary-600 shrink-0" />
                              <span className="font-medium text-slate-800 dark:text-slate-200">{p.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={CATEGORIA_BADGE[p.categoria] ?? 'neutral'}>
                              {CATEGORIA_LABELS[p.categoria] ?? p.categoria}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={clsx(
                              'font-bold text-base',
                              variant === 'danger' ? 'text-red-500' :
                              variant === 'warning' ? 'text-amber-500' : 'text-green-600'
                            )}>
                              {formatNumber(p.stock_actual, 0)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">{p.unidad}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                            {formatNumber(p.stock_minimo, 0)} {p.unidad}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">{p.unidad}</td>
                          <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                            RD$ {formatNumber(p.precio_unitario, 2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={variant}>{stockLabel(p)}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <HistorialView productos={productos} />
      )}

      {/* Product detail modal */}
      <ProductDetailModal
        producto={detailProd}
        auditoria={auditoria}
        canEdit={canEdit}
        onEntrada={p => openEntrada(p)}
        onEdit={p => openEdit(p)}
        onToggle={async () => { await toggleProductoActivo(detailProd.id); setDetailProd(null) }}
        onClose={() => setDetailProd(null)}
      />

      {/* Entrada modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Registrar Entrada — ${modalProd?.nombre}`}
        size="sm"
      >
        {successMsg ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleEntrada} className="p-6 space-y-4">
            <Input
              label={`Cantidad (${modalProd?.unidad})`}
              type="number"
              min="1"
              step="1"
              value={cantidad}
              onChange={e => { setCantidad(e.target.value); setCantError('') }}
              error={cantError}
              placeholder="0"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notas (opcional)</label>
              <textarea
                rows={2}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej: Compra mensual, proveedor XYZ"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600 transition-all resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" className="flex-1" loading={saving}>
                Registrar
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Crear / Editar producto modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? `Editar — ${editTarget.nombre}` : 'Nuevo Producto'}
        size="sm"
      >
        <form onSubmit={handleFormSave} className="p-6 space-y-4">
          <Input
            label="Nombre *"
            value={formData.nombre}
            onChange={e => fField('nombre', e.target.value)}
            error={formErrors.nombre}
            placeholder="Ej: Gasolina Regular"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoría *</label>
            <Select
              value={formData.categoria}
              onChange={e => { fField('categoria', e.target.value); fField('categoriaCustom', '') }}
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{CATEGORIA_LABELS[c] ?? c}</option>
              ))}
            </Select>
          </div>
          {formData.categoria === 'otro' && (
            <Input
              label="Nombre de la categoría *"
              value={formData.categoriaCustom}
              onChange={e => fField('categoriaCustom', e.target.value)}
              error={formErrors.categoriaCustom}
              placeholder="Ej: Herramientas, Llantas, Refrigerante"
            />
          )}
          <Input
            label="Unidad *"
            value={formData.unidad}
            onChange={e => fField('unidad', e.target.value)}
            error={formErrors.unidad}
            placeholder="Ej: galones, litros, unidad"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock mínimo *"
              type="number"
              min="0"
              step="1"
              value={formData.stock_minimo}
              onChange={e => fField('stock_minimo', e.target.value)}
              error={formErrors.stock_minimo}
              placeholder="0"
            />
            <Input
              label="Precio unitario *"
              type="number"
              min="0"
              step="0.01"
              value={formData.precio_unitario}
              onChange={e => fField('precio_unitario', e.target.value)}
              error={formErrors.precio_unitario}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={formSaving}>
              {editTarget ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import modal */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importarProductos}
      />
    </div>
  )
}
