import { useEffect, useState, useCallback } from 'react'
import { Fuel, Droplets, AlertTriangle, ClipboardCheck, ArrowRight, Printer, Loader2, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { formatDateTime, formatNumber } from '../utils/format'
import { exportDespachoIndividualPDF } from '../lib/exportPdf'

const TODAY = new Date().toISOString().slice(0, 10)

const CHART_COLORS = ['#1a3c8f', '#c8a951', '#10b981', '#f59e0b', '#6366f1']

function KpiCard({ icon: Icon, label, value, sub, color, alert }) {
  return (
    <Card className={alert ? 'border-red-300 dark:border-red-700' : ''}>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

function DetalleDespacho({ despacho }) {
  if (!despacho) return null
  return (
    <div className="px-6 py-4 space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Fecha y hora</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(despacho.fecha_despacho)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Vehículo</p>
          <p className="font-plate font-bold text-slate-900 dark:text-slate-100 text-lg leading-none">{despacho.placa}</p>
          <p className="text-xs text-slate-500 mt-0.5">{despacho.marca} {despacho.modelo}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Producto</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{despacho.producto_nombre}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Cantidad</p>
          <p className="font-bold text-2xl text-primary-600 leading-none">{formatNumber(despacho.cantidad, 0)}</p>
          <p className="text-xs text-slate-500">{despacho.unidad}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Solicitado por</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{despacho.solicitado_por}</p>
        </div>
        {despacho.despachador_nombre && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Despachado por</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{despacho.despachador_nombre}</p>
          </div>
        )}
        {despacho.cedula_receptor && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Cédula receptor</p>
            <p className="font-plate text-slate-900 dark:text-slate-100">{despacho.cedula_receptor}</p>
          </div>
        )}
        {despacho.km_vehiculo && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Km vehículo</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(despacho.km_vehiculo, 0)} km</p>
          </div>
        )}
        {despacho.observaciones && (
          <div className="col-span-2">
            <p className="text-xs font-medium text-slate-400 uppercase mb-0.5">Observaciones</p>
            <p className="text-slate-700 dark:text-slate-300">{despacho.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { productos } = useData()
  const { hasPermiso } = useAuth()

  const [despachos,      setDespachos]      = useState([])
  const [consumoChart,   setConsumoChart]   = useState([])
  const [chartProductos, setChartProductos] = useState([])
  const [despachoDetalle, setDespachoDetalle] = useState(null)
  const [printing,        setPrinting]        = useState(false)
  const [printErr,        setPrintErr]        = useState(null)

  // Una sola llamada consolida despachos recientes + consumo diario
  useEffect(() => {
    async function loadDashboard() {
      try {
        const { despachos_recientes, consumo_diario } = await api.get('/reportes/dashboard')
        setDespachos(despachos_recientes)

        const combustibles = consumo_diario.filter(r => r.categoria === 'combustible')
        setChartProductos([...new Set(combustibles.map(r => r.producto))])

        const days = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          days.push(`${mm}/${dd}`)
        }
        const byDate = {}
        days.forEach(f => { byDate[f] = { fecha: f } })
        combustibles.forEach(r => {
          const fecha = String(r.fecha).slice(5, 10).replace('-', '/')
          if (!byDate[fecha]) byDate[fecha] = { fecha }
          byDate[fecha][r.producto] = Number(r.total)
        })
        setConsumoChart(days.map(d => byDate[d]))
      } catch (err) {
        console.error('[Dashboard]', err.message)
      }
    }
    loadDashboard()
  }, [])

  const handleRowClick = useCallback(async (id) => {
    setPrintErr(null)
    setDespachoDetalle({ id, _loading: true })
    try {
      const data = await api.get(`/despachos/${id}`)
      setDespachoDetalle(data)
    } catch (err) {
      setDespachoDetalle({ id, _error: err.message ?? 'Error al cargar despacho' })
    }
  }, [])

  const handlePrint = useCallback(async () => {
    if (!despachoDetalle || despachoDetalle._loading || despachoDetalle._error) return
    setPrinting(true)
    setPrintErr(null)
    try {
      await exportDespachoIndividualPDF(despachoDetalle)
    } catch (err) {
      setPrintErr(err.message ?? 'Error al generar PDF')
    } finally {
      setPrinting(false)
    }
  }, [despachoDetalle])

  const todayDespachos   = despachos.filter(d => d.fecha_despacho?.startsWith(TODAY))
  const todayCombustible = todayDespachos.filter(d => d.categoria === 'combustible').reduce((s, d) => s + Number(d.cantidad), 0)
  const todayAceite      = todayDespachos.filter(d => d.categoria === 'aceite_motor').reduce((s, d) => s + Number(d.cantidad), 0)
  const lowStock         = productos.filter(p => Number(p.stock_actual) <= Number(p.stock_minimo))
  const recentDespachos  = despachos

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resumen del día · {new Date().toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {hasPermiso('despachos.crear') && (
          <Link to="/nuevo-despacho">
            <Button icon={<Plus className="w-4 h-4" />}>Nuevo Despacho</Button>
          </Link>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ClipboardCheck} label="Despachos hoy"    value={todayDespachos.length}    color="bg-primary-600" />
        <KpiCard icon={Fuel}          label="Combustible hoy"  value={`${todayCombustible} gal`} color="bg-gold-500" />
        <KpiCard icon={Droplets}      label="Aceite motor hoy" value={`${todayAceite} ctos`}     color="bg-emerald-600" />
        <KpiCard icon={AlertTriangle} label="Alertas stock"    value={lowStock.length}
          alert={lowStock.length > 0}
          color={lowStock.length > 0 ? 'bg-red-500' : 'bg-slate-400'}
          sub={lowStock.length > 0 ? 'Productos bajo mínimo' : 'Todo en orden'} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Consumo últimos 7 días (galones)</h2>
          </CardHeader>
          <CardBody>
            {consumoChart.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">
                Sin datos de consumo esta semana
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={consumoChart} barGap={4}>
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {chartProductos.map((nombre, i) => (
                    <Bar key={nombre} dataKey={nombre} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Estado de inventario</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {productos.slice(0, 6).map(p => {
              const pct = Math.min(100, (Number(p.stock_actual) / (Number(p.stock_minimo) * 3)) * 100)
              const isLow  = Number(p.stock_actual) <= Number(p.stock_minimo)
              const isCrit = Number(p.stock_actual) <= Number(p.stock_minimo) * 0.5
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate pr-2">{p.nombre}</span>
                    <span className={`text-xs font-mono font-semibold flex-shrink-0 ${isCrit ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-500'}`}>
                      {p.stock_actual} {p.unidad}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isCrit ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Recent dispatches */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Últimos despachos</h2>
          <Link to="/despachos" className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['#', 'Fecha', 'Vehículo', 'Producto', 'Cantidad', 'Receptor'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDespachos.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={() => handleRowClick(d.id)}
                  className={`border-b border-slate-50 dark:border-slate-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}
                >
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-primary-600">#{String(d.id).padStart(6, '0')}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDateTime(d.fecha_despacho)}</td>
                  <td className="px-6 py-3 font-plate font-semibold text-slate-900 dark:text-slate-100">{d.placa}</td>
                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">{d.producto_nombre}</td>
                  <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">{d.cantidad} {d.unidad}</td>
                  <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{d.solicitado_por}</td>
                </tr>
              ))}
              {recentDespachos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <p className="text-slate-400 mb-3">Sin despachos registrados</p>
                    {hasPermiso('despachos.crear') && (
                      <Link to="/nuevo-despacho">
                        <Button icon={<Plus className="w-4 h-4" />} size="sm">Registrar primer despacho</Button>
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal detalle */}
      <Modal
        open={!!despachoDetalle}
        onClose={() => { setDespachoDetalle(null); setPrintErr(null) }}
        title={despachoDetalle && !despachoDetalle._loading
          ? `Despacho #${String(despachoDetalle.id).padStart(6, '0')}`
          : 'Cargando…'}
        size="md"
      >
        {despachoDetalle?._loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">Cargando detalle…</div>
        ) : despachoDetalle?._error ? (
          <div className="px-6 py-10 text-center text-sm text-red-500">{despachoDetalle._error}</div>
        ) : (
          <>
            <DetalleDespacho despacho={despachoDetalle} />
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              {printErr && <p className="text-xs text-red-500">⚠ {printErr}</p>}
              <div className="ml-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  disabled={printing}
                  onClick={handlePrint}
                >
                  {printing ? 'Generando…' : 'Imprimir'}
                </Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
