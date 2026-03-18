import { useState, useMemo, useEffect, useCallback } from 'react'
import { BarChart2, Loader2 } from 'lucide-react'
import ExportMenu from '../components/ui/ExportMenu'
import {
  exportReporteDiarioPDF, exportReporteMensualPDF,
  exportReporteVehiculoPDF, exportInventarioPDF,
} from '../lib/exportPdf'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import AccessDenied from '../components/ui/AccessDenied'
import { CATEGORIA_LABELS, formatDate, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../components/ui/Card'

const TABS = [
  { id: 'diario',    label: 'Consumo Diario' },
  { id: 'mensual',   label: 'Consumo Mensual' },
  { id: 'vehiculo',  label: 'Por Vehículo' },
  { id: 'inventario',label: 'Inventario Actual' },
]

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

function downloadCSV(rows, headers, filename) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const fecha = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
  const meta = [
    '"UNIVERSIDAD AUTÓNOMA DE SANTO DOMINGO (UASD)"',
    '"Sistema de Despacho — Departamento de Suministros"',
    `"Generado el: ${fecha}"`,
    '',
  ]
  const csv = [...meta, headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const CHART_COLORS = ['#1a3c8f', '#c8a951', '#22c55e', '#f97316', '#a855f7']

// ── Diario ────────────────────────────────────────────────────────────────────
function TabDiario() {
  const today = new Date().toISOString().slice(0, 10)
  const [fecha,   setFecha]   = useState(today)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const fetch = useCallback(async (f) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/despachos?fecha_desde=${f}&fecha_hasta=${f}&limit=200`)
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) { setError(err.message); setRows([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch(fecha) }, [fecha, fetch])

  const datos = useMemo(() => {
    const map = {}
    rows.forEach(d => {
      const key = d.producto_id
      if (!map[key]) map[key] = { nombre: d.producto_nombre, categoria: d.categoria, unidad: d.unidad, total: 0 }
      map[key].total += Number(d.cantidad)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [rows])

  const chartData = useMemo(() => datos.map(d => ({ name: d.nombre, cantidad: d.total })), [datos])

  function exportarCSV() {
    downloadCSV(
      datos.map(d => [fecha, d.nombre, CATEGORIA_LABELS[d.categoria] ?? d.categoria, d.total, d.unidad]),
      ['Fecha', 'Producto', 'Categoría', 'Cantidad', 'Unidad'],
      `consumo_diario_${fecha}.csv`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
          />
        </div>
        {datos.length > 0 && (
          <ExportMenu
            onPDF={() => exportReporteDiarioPDF(datos, fecha)}
            onCSV={exportarCSV}
          />
        )}
      </div>

      {loading ? (
        <Card><CardBody><div className="flex items-center justify-center py-8 gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div></CardBody></Card>
      ) : error ? (
        <Card><CardBody><p className="text-center text-red-500 py-8">Error: {error}</p></CardBody></Card>
      ) : datos.length === 0 ? (
        <Card><CardBody><p className="text-center text-slate-400 py-8">Sin despachos para esta fecha.</p></CardBody></Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#1a3c8f" radius={[4, 4, 0, 0]} name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Categoría</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                    <td className="px-4 py-3"><Badge variant={CATEGORIA_BADGE[d.categoria] ?? 'neutral'}>{CATEGORIA_LABELS[d.categoria] ?? d.categoria}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">{formatNumber(d.total, 0)}</td>
                    <td className="px-4 py-3 text-slate-500">{d.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Mensual ───────────────────────────────────────────────────────────────────
function TabMensual({ productos }) {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [año, setAño] = useState(now.getFullYear())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchMensual = useCallback(async (m, y) => {
    const mesStr = String(m).padStart(2, '0')
    const lastDay = new Date(y, m, 0).getDate()
    const fechaDesde = `${y}-${mesStr}-01`
    const fechaHasta = `${y}-${mesStr}-${String(lastDay).padStart(2, '0')}`
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/despachos?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&limit=200`)
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err) { setError(err.message); setRows([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMensual(mes, año) }, [mes, año, fetchMensual])

  const prefix = `${año}-${String(mes).padStart(2, '0')}`

  const datos = useMemo(() => {
    const map = {}
    rows.forEach(d => {
      const key = d.producto_id
      if (!map[key]) map[key] = { nombre: d.producto_nombre, categoria: d.categoria, unidad: d.unidad, total: 0, despachos: 0 }
      map[key].total    += Number(d.cantidad)
      map[key].despachos += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [rows])

  const chartData = useMemo(() => datos.map(d => ({ name: d.nombre, cantidad: d.total, despachos: d.despachos })), [datos])

  function exportarCSV() {
    downloadCSV(
      datos.map(d => [prefix, d.nombre, CATEGORIA_LABELS[d.categoria] ?? d.categoria, d.total, d.unidad, d.despachos]),
      ['Mes', 'Producto', 'Categoría', 'Total', 'Unidad', 'Nº Despachos'],
      `consumo_mensual_${prefix}.csv`
    )
  }

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
            >
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Año</label>
            <input
              type="number"
              value={año}
              onChange={e => setAño(Number(e.target.value))}
              min="2020"
              max={now.getFullYear()}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40 w-24"
            />
          </div>
        </div>
        <ExportMenu
          onPDF={() => exportReporteMensualPDF(datos, mes, año)}
          onCSV={exportarCSV}
          disabled={datos.length === 0}
        />
      </div>

      {loading ? (
        <Card><CardBody><div className="flex items-center justify-center py-8 gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div></CardBody></Card>
      ) : error ? (
        <Card><CardBody><p className="text-center text-red-500 py-8">Error: {error}</p></CardBody></Card>
      ) : datos.length === 0 ? (
        <Card><CardBody><p className="text-center text-slate-400 py-8">Sin despachos para este mes.</p></CardBody></Card>
      ) : (
        <>
          <Card>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#1a3c8f" radius={[4, 4, 0, 0]} name="Cantidad" />
                  <Bar dataKey="despachos" fill="#c8a951" radius={[4, 4, 0, 0]} name="Nº Despachos" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Categoría</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Unidad</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Despachos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {datos.map((d, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.nombre}</td>
                    <td className="px-4 py-3"><Badge variant={CATEGORIA_BADGE[d.categoria] ?? 'neutral'}>{CATEGORIA_LABELS[d.categoria] ?? d.categoria}</Badge></td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">{formatNumber(d.total, 0)}</td>
                    <td className="px-4 py-3 text-slate-500">{d.unidad}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{d.despachos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Por Vehículo ──────────────────────────────────────────────────────────────
function TabVehiculo({ vehiculos, dependencias }) {
  const [vehiculoId, setVehiculoId] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [desde, setDesde] = useState(monthAgo)
  const [hasta, setHasta] = useState(today)
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchVehiculo = useCallback(async (vid, d, h) => {
    if (!vid) { setDatos([]); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/despachos?vehiculo_id=${vid}&fecha_desde=${d}&fecha_hasta=${h}&limit=200`)
      const arr = Array.isArray(res.data) ? res.data : []
      setDatos(arr.sort((a, b) => a.fecha_despacho.localeCompare(b.fecha_despacho)))
    } catch (err) { setError(err.message); setDatos([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchVehiculo(vehiculoId, desde, hasta) }, [vehiculoId, desde, hasta, fetchVehiculo])

  const chartData = useMemo(() => {
    const map = {}
    datos.forEach(d => {
      const day = d.fecha_despacho.slice(0, 10)
      if (!map[day]) map[day] = { fecha: day }
      const key = d.producto_nombre ?? `prod-${d.producto_id}`
      map[day][key] = (map[day][key] ?? 0) + Number(d.cantidad)
    })
    return Object.values(map)
  }, [datos])

  const productKeys = [...new Set(datos.map(d => d.producto_nombre ?? `prod-${d.producto_id}`))]

  const v = vehiculos.find(v => v.id === Number(vehiculoId))
  const dep = v ? dependencias.find(d => d.id === v.dependencia_id) : null

  function exportarCSV() {
    downloadCSV(
      datos.map(d => [d.fecha_despacho.slice(0, 10), v?.placa, d.producto_nombre, d.cantidad, d.unidad, d.solicitado_por]),
      ['Fecha', 'Placa', 'Producto', 'Cantidad', 'Unidad', 'Solicitado por'],
      `vehiculo_${v?.placa ?? vehiculoId}_${desde}_${hasta}.csv`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vehículo</label>
          <select
            value={vehiculoId}
            onChange={e => setVehiculoId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
          >
            <option value="">Seleccionar vehículo…</option>
            {vehiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-600/40" />
        </div>
        {vehiculoId && datos.length > 0 && (
          <ExportMenu
            onPDF={() => exportReporteVehiculoPDF(datos, v, desde, hasta)}
            onCSV={exportarCSV}
          />
        )}
      </div>

      {!vehiculoId && (
        <Card><CardBody><p className="text-center text-slate-400 py-8">Seleccione un vehículo para ver el reporte.</p></CardBody></Card>
      )}

      {vehiculoId && loading && (
        <Card><CardBody><div className="flex items-center justify-center py-8 gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div></CardBody></Card>
      )}

      {vehiculoId && !loading && error && (
        <Card><CardBody><p className="text-center text-red-500 py-8">Error: {error}</p></CardBody></Card>
      )}
      {vehiculoId && !loading && !error && datos.length === 0 && (
        <Card><CardBody><p className="text-center text-slate-400 py-8">Sin despachos para este vehículo en el período seleccionado.</p></CardBody></Card>
      )}

      {vehiculoId && !loading && !error && datos.length > 0 && (
        <>
          {/* Info vehículo */}
          {v && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <span className="font-plate font-bold text-primary-600 text-xl">{v.placa}</span>
              <span className="text-slate-600 dark:text-slate-400 text-sm">{v.marca} {v.modelo} ({v.año}) · {dep?.nombre}</span>
            </div>
          )}

          {/* Chart */}
          <Card>
            <CardBody>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {productKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === productKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Cantidad</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 hidden sm:table-cell">Solicitado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {datos.map(d => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-slate-500">{formatDate(d.fecha_despacho)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{d.producto_nombre}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(d.cantidad, 0)} {d.unidad}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{d.solicitado_por}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Inventario Actual ─────────────────────────────────────────────────────────
function TabInventario({ productos }) {
  function stockVariant(p) {
    if (p.stock_actual <= 0) return 'danger'
    if (p.stock_actual <= p.stock_minimo) return 'danger'
    if (p.stock_actual <= p.stock_minimo * 2) return 'warning'
    return 'success'
  }
  function stockLabel(p) {
    if (p.stock_actual <= 0) return 'Sin stock'
    if (p.stock_actual <= p.stock_minimo) return 'Crítico'
    if (p.stock_actual <= p.stock_minimo * 2) return 'Bajo'
    return 'OK'
  }

  function exportarCSV() {
    downloadCSV(
      productos.map(p => [p.nombre, CATEGORIA_LABELS[p.categoria] ?? p.categoria, p.stock_actual, p.stock_minimo, p.unidad, stockLabel(p)]),
      ['Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Estado'],
      `inventario_${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportMenu
          onPDF={() => exportInventarioPDF(productos)}
          onCSV={exportarCSV}
          disabled={productos.length === 0}
        />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Stock Actual</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Mínimo</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Unidad</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {productos.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{p.nombre}</td>
                <td className="px-4 py-3"><Badge variant={CATEGORIA_BADGE[p.categoria] ?? 'neutral'}>{CATEGORIA_LABELS[p.categoria] ?? p.categoria}</Badge></td>
                <td className="px-4 py-3 text-right font-bold text-primary-600">{formatNumber(p.stock_actual, 0)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{p.stock_minimo}</td>
                <td className="px-4 py-3 text-slate-500">{p.unidad}</td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={stockVariant(p)}>{stockLabel(p)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Reportes() {
  const { productos, vehiculos, dependencias } = useData()
  const { hasPermiso } = useAuth()
  const [activeTab, setActiveTab] = useState('diario')

  if (!hasPermiso('reportes.ver')) return <AccessDenied />

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Reportes</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Análisis y estadísticas de despachos e inventario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'diario'     && <TabDiario />}
      {activeTab === 'mensual'    && <TabMensual />}
      {activeTab === 'vehiculo'   && <TabVehiculo vehiculos={vehiculos} dependencias={dependencias} />}
      {activeTab === 'inventario' && <TabInventario productos={productos} />}
    </div>
  )
}
