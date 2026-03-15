import { Fuel, Droplets, AlertTriangle, ClipboardCheck, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { DESPACHOS, VEHICULOS, DEPENDENCIAS, PRODUCTOS, CONSUMO_7DIAS } from '../utils/mockData'
import { formatDateTime, CATEGORIA_LABELS } from '../utils/format'

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

const TODAY = '2026-03-15'

export default function Dashboard() {
  const todayDespachos = DESPACHOS.filter(d => d.fecha_despacho.startsWith(TODAY))
  const todayCombustible = todayDespachos
    .filter(d => [1,2].includes(d.producto_id))
    .reduce((s, d) => s + d.cantidad, 0)
  const todayAceite = todayDespachos
    .filter(d => [3,4].includes(d.producto_id))
    .reduce((s, d) => s + d.cantidad, 0)
  const lowStock = PRODUCTOS.filter(p => p.stock_actual <= p.stock_minimo)

  const recentDespachos = [...DESPACHOS]
    .sort((a, b) => new Date(b.fecha_despacho) - new Date(a.fecha_despacho))
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Resumen del día · 15/03/2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ClipboardCheck} label="Despachos hoy"    value={todayDespachos.length}           color="bg-primary-600" />
        <KpiCard icon={Fuel}          label="Combustible hoy"  value={`${todayCombustible} gal`}        color="bg-gold-500" />
        <KpiCard icon={Droplets}      label="Aceite motor hoy" value={`${todayAceite} ctos`}            color="bg-emerald-600" />
        <KpiCard icon={AlertTriangle} label="Alertas stock"    value={lowStock.length} alert={lowStock.length > 0} color={lowStock.length > 0 ? 'bg-red-500' : 'bg-slate-400'} sub={lowStock.length > 0 ? 'Productos bajo mínimo' : 'Todo en orden'} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Consumo últimos 7 días (galones)</h2>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={CONSUMO_7DIAS} barGap={4}>
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gasolina" name="Gasolina" fill="#1a3c8f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gasoil"   name="Gasoil"   fill="#c8a951" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Stock alerts */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Estado de inventario</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {PRODUCTOS.slice(0, 6).map(p => {
              const pct = Math.min(100, (p.stock_actual / (p.stock_minimo * 3)) * 100)
              const isLow = p.stock_actual <= p.stock_minimo
              const isCrit = p.stock_actual <= p.stock_minimo * 0.5
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate pr-2">{p.nombre}</span>
                    <span className={`text-xs font-mono font-semibold flex-shrink-0 ${isCrit ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-slate-500'}`}>
                      {p.stock_actual} {p.unidad}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isCrit ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Recent dispatches table */}
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
                {['Fecha', 'Vehículo', 'Producto', 'Cantidad', 'Receptor'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDespachos.map((d, i) => {
                const veh = VEHICULOS.find(v => v.id === d.vehiculo_id)
                const prod = PRODUCTOS.find(p => p.id === d.producto_id)
                return (
                  <tr key={d.id} className={`border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/50'}`}>
                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDateTime(d.fecha_despacho)}</td>
                    <td className="px-6 py-3 font-plate font-semibold text-slate-900 dark:text-slate-100">{veh?.placa}</td>
                    <td className="px-6 py-3">
                      <span className="text-slate-700 dark:text-slate-300">{prod?.nombre}</span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">{d.cantidad} {d.unidad}</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{d.solicitado_por}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
