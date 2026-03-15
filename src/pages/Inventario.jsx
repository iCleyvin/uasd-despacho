import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Package } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Card, { CardHeader, CardBody } from '../components/ui/Card'

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

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

function StockBar({ producto }) {
  const max = producto.stock_minimo * 4
  const pct = Math.min(100, (producto.stock_actual / max) * 100)
  const color = stockVariant(producto)
  const barClass = {
    success: 'bg-green-500',
    warning: 'bg-amber-400',
    danger:  'bg-red-500',
    neutral: 'bg-slate-400',
  }[color]
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MovimientosTable({ productoId, auditoria }) {
  const movs = auditoria
    .filter(a => a.tabla === 'productos' && a.registro_id === productoId)
    .slice(0, 5)

  if (movs.length === 0) {
    return <p className="text-sm text-slate-400 py-3">No hay movimientos registrados.</p>
  }

  return (
    <table className="w-full text-sm mt-2">
      <thead>
        <tr className="text-left text-xs text-slate-400">
          <th className="pb-1 font-medium">Fecha</th>
          <th className="pb-1 font-medium">Acción</th>
          <th className="pb-1 font-medium text-right">Stock antes</th>
          <th className="pb-1 font-medium text-right">Stock después</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {movs.map(m => (
          <tr key={m.id}>
            <td className="py-1.5 text-slate-500">{formatDateTime(m.created_at)}</td>
            <td className="py-1.5">
              <Badge variant={m.accion === 'ENTRADA' ? 'success' : 'neutral'}>
                {m.accion === 'ENTRADA' ? 'Entrada' : 'Despacho'}
              </Badge>
            </td>
            <td className="py-1.5 text-right text-slate-600 dark:text-slate-400">{m.datos_antes?.stock_actual ?? '—'}</td>
            <td className="py-1.5 text-right font-medium text-slate-800 dark:text-slate-200">{m.datos_nuevo?.stock_actual ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Inventario() {
  const { productos, auditoria, registrarEntrada } = useData()

  const [expanded,    setExpanded]    = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [modalProd,   setModalProd]   = useState(null)
  const [cantidad,    setCantidad]    = useState('')
  const [notas,       setNotas]       = useState('')
  const [cantError,   setCantError]   = useState('')
  const [saving,      setSaving]      = useState(false)
  const [successMsg,  setSuccessMsg]  = useState('')

  const lowStock = productos.filter(p => p.stock_actual <= p.stock_minimo)

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
    await new Promise(r => setTimeout(r, 350))
    registrarEntrada(modalProd.id, Number(cantidad), notas)
    setSuccessMsg(`Se registraron ${cantidad} ${modalProd.unidad} de ${modalProd.nombre}`)
    setSaving(false)
    setTimeout(() => setModalOpen(false), 1200)
  }

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Inventario</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {productos.length} productos en total
            {lowStock.length > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                · {lowStock.length} con stock bajo o crítico
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            ⚠ Productos con stock bajo o crítico: {lowStock.map(p => p.nombre).join(', ')}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {productos.map(p => {
          const isExpanded = expanded === p.id
          const variant = stockVariant(p)
          return (
            <Card key={p.id} className="overflow-hidden flex flex-col">
              {/* Card header toggle */}
              <button
                className="flex items-start justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : p.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary-600 shrink-0" />
                    <Badge variant={CATEGORIA_BADGE[p.categoria] ?? 'neutral'}>
                      {CATEGORIA_LABELS[p.categoria] ?? p.categoria}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">{p.nombre}</h3>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-2 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2 mt-0.5" />
                }
              </button>

              <div className="px-4 pb-4 flex-1 flex flex-col">
                {/* Stock number */}
                <div className="flex items-end gap-2 mb-2">
                  <span className={clsx(
                    'text-3xl font-bold leading-none',
                    variant === 'danger' ? 'text-red-500' :
                    variant === 'warning' ? 'text-amber-500' : 'text-green-600'
                  )}>
                    {formatNumber(p.stock_actual, 0)}
                  </span>
                  <span className="text-sm text-slate-500 mb-0.5">{p.unidad}</span>
                  <Badge variant={variant} className="ml-auto">{stockLabel(p)}</Badge>
                </div>

                {/* Bar */}
                <StockBar producto={p} />

                <p className="text-xs text-slate-400 mt-1.5">Mínimo: {p.stock_minimo} {p.unidad}</p>

                {/* Button */}
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => openEntrada(p)}
                  className="mt-3 w-full"
                >
                  Registrar Entrada
                </Button>

                {/* Expanded movements */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Últimos movimientos</p>
                    <MovimientosTable productoId={p.id} auditoria={auditoria} />
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Modal entrada */}
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
    </div>
  )
}
