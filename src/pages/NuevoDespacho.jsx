import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Printer, RotateCcw, Search, AlertTriangle, Truck, ClipboardCheck, Plus, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import AccessDenied from '../components/ui/AccessDenied'
import { api } from '../lib/api'
import { exportTicketPDF } from '../lib/exportPdf'

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

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

// Detecta conflicto entre el tipo de combustible del producto y el del vehículo.
// Retorna un string descriptivo si hay conflicto, null si no.
function detectarConflictoCombustible(producto, vehiculoCombustible) {
  if (!producto || producto.categoria !== 'combustible') return null
  if (!vehiculoCombustible) return null
  const n = producto.nombre.toLowerCase()
  const prodEsGasolina = /gasolina|regular|premium|super/.test(n)
  const prodEsGasoil   = /gasoil|diesel|gasoleo/.test(n)
  if (vehiculoCombustible === 'Electrico')
    return `Este vehículo es eléctrico y no debería recibir combustible`
  if (vehiculoCombustible === 'Hibrido') return null // híbrido acepta combustible
  if (vehiculoCombustible === 'Gasolina' && prodEsGasoil)
    return `Este vehículo usa Gasolina pero estás despachando Gasoil`
  if (vehiculoCombustible === 'Gasoil' && prodEsGasolina)
    return `Este vehículo usa Gasoil pero estás despachando Gasolina`
  return null
}

function stockVariant(producto) {
  if (!producto) return 'neutral'
  if (producto.stock_actual <= 0) return 'danger'
  if (producto.stock_actual <= producto.stock_minimo) return 'danger'
  if (producto.stock_actual <= producto.stock_minimo * 2) return 'warning'
  return 'success'
}

const newLinea = () => ({ id: Date.now() + Math.random(), producto_id: '', cantidad: '' })

const EMPTY_FORM = {
  vehiculo_id:     null,
  solicitado_por:  '',
  cedula_receptor: '',
  km_vehiculo:     '',
  observaciones:   '',
}

function TicketView({ ticket, depTicket, onReset }) {
  const { items, vehiculo, despachador } = ticket
  const first = items[0]?.despacho
  const last  = items[items.length - 1]?.despacho

  const [printErr, setPrintErr] = useState(null)

  async function handlePrintTicket() {
    setPrintErr(null)
    try { await exportTicketPDF({ items, vehiculo, despachador, depTicket }) }
    catch (err) { setPrintErr(err.message ?? 'Error al generar el PDF') }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <Card className="overflow-hidden">
        <div className="bg-primary-600 px-6 py-5 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-white" />
          <div>
            <h1 className="text-white font-display font-bold text-xl">
              {items.length === 1 ? 'Despacho Registrado' : `${items.length} Despachos Registrados`}
            </h1>
            <p className="text-primary-200 text-sm">
              {items.length === 1
                ? `#${String(first.id).padStart(6, '0')}`
                : `#${String(first.id).padStart(6, '0')} — #${String(last.id).padStart(6, '0')}`}
            </p>
          </div>
        </div>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Fecha y hora</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(first.fecha_despacho)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Vehículo</p>
              <p className="font-plate font-bold text-primary-600 text-lg leading-none">{vehiculo?.placa}</p>
              <p className="text-xs text-slate-500">{vehiculo?.marca} {vehiculo?.modelo}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Solicitado por</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{first.solicitado_por}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Despachado por</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{despachador}</p>
            </div>
            {first.cedula_receptor && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Cédula receptor</p>
                <p className="font-plate text-slate-900 dark:text-slate-100">{first.cedula_receptor}</p>
              </div>
            )}
            {first.km_vehiculo && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Km vehículo</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(first.km_vehiculo, 0)} km</p>
              </div>
            )}
            {depTicket && (
              <div className="col-span-2">
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Dependencia</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{depTicket.nombre}</p>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900/40 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                Productos despachados
              </p>
            </div>
            {items.map(({ despacho, producto }, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{producto?.nombre}</p>
                  <p className="text-xs text-slate-400">#{String(despacho.id).padStart(6, '0')}</p>
                </div>
                <p className="font-bold text-primary-600 text-lg leading-none">
                  {formatNumber(despacho.cantidad, 0)} <span className="text-xs font-normal text-slate-400">{despacho.unidad}</span>
                </p>
              </div>
            ))}
          </div>

          {first.observaciones && (
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Observaciones</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{first.observaciones}</p>
            </div>
          )}

          {printErr && (
            <p className="text-xs text-red-600 dark:text-red-400">⚠ {printErr}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrintTicket} className="flex-1">
              Imprimir
            </Button>
            <Button variant="primary" icon={<RotateCcw className="w-4 h-4" />} onClick={onReset} className="flex-1">
              Nuevo Despacho
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default function NuevoDespacho() {
  const { user, hasPermiso } = useAuth()
  const { vehiculos, productos, dependencias, crearDespacho, reloadProductos } = useData()

  // Refrescar stock al abrir el formulario para mostrar valores reales
  useEffect(() => { reloadProductos() }, [reloadProductos])

  const [form, setForm]                         = useState(EMPTY_FORM)
  const [lineas, setLineas]                     = useState([newLinea()])
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [vehiculoSearch, setVehiculoSearch]     = useState('')
  const [showDropdown, setShowDropdown]         = useState(false)
  const [errors, setErrors]                     = useState({})
  const [submitting, setSubmitting]             = useState(false)
  const [ticket, setTicket]                     = useState(null)
  const [despachoSemana, setDespachoSemana]     = useState(null)
  const [confirmando, setConfirmando]           = useState(false)
  const searchRef  = useRef(null)
  const dropdownRef = useRef(null)

  const filteredVehiculos = vehiculos.filter(v => {
    if (!vehiculoSearch.trim()) return false
    const q = vehiculoSearch.toLowerCase()
    return (
      v.placa.toLowerCase().includes(q) ||
      v.marca.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q) ||
      (v.matricula ?? '').toLowerCase().includes(q) ||
      (v.ficha_vieja ?? '').toLowerCase().includes(q)
    )
  }).filter(v => v.activo)

  // Chequeo de despacho reciente — aplica al primer producto de la lista
  const firstProductoId = lineas[0]?.producto_id ?? ''
  useEffect(() => {
    if (!form.vehiculo_id || !firstProductoId) { setDespachoSemana(null); return }
    const controller = new AbortController()
    const now  = new Date()
    const day  = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    const fechaDesde = monday.toISOString().slice(0, 10)
    api.get(`/despachos?vehiculo_id=${form.vehiculo_id}&producto_id=${firstProductoId}&fecha_desde=${fechaDesde}&limit=1`, { signal: controller.signal })
      .then(res => setDespachoSemana(res.data?.[0] ?? null))
      .catch(err => { if (err.name !== 'AbortError') setDespachoSemana(null) })
    return () => controller.abort()
  }, [form.vehiculo_id, firstProductoId])

  // close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!hasPermiso('despachos.crear')) return <AccessDenied />

  function handleVehiculoSelect(v) {
    setSelectedVehiculo(v)
    setForm(f => ({ ...f, vehiculo_id: v.id }))
    setVehiculoSearch(v.placa)
    setShowDropdown(false)
    setErrors(e => ({ ...e, vehiculo_id: undefined }))
  }

  function clearVehiculo() {
    setSelectedVehiculo(null)
    setForm(f => ({ ...f, vehiculo_id: null }))
    setVehiculoSearch('')
  }

  function addLinea() {
    setLineas(prev => [...prev, newLinea()])
  }

  function removeLinea(idx) {
    setLineas(prev => prev.filter((_, i) => i !== idx))
    setErrors(ev => {
      const next = { ...ev }
      delete next[`producto_${idx}`]
      delete next[`cantidad_${idx}`]
      return next
    })
  }

  function updateLinea(idx, field, value) {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function validate() {
    const e = {}
    if (!form.vehiculo_id)           e.vehiculo_id    = 'Seleccione un vehículo'
    if (!form.solicitado_por.trim()) e.solicitado_por = 'Campo requerido'

    // Verificar conflictos de combustible
    const hayConflictoCombustible = lineas.some(linea => {
      const prod = productos.find(p => p.id === Number(linea.producto_id))
      return !!detectarConflictoCombustible(prod, selectedVehiculo?.combustible)
    })

    if (despachoSemana && !form.observaciones.trim())
      e.observaciones = 'Debe explicar el motivo del despacho repetido esta semana'
    else if (hayConflictoCombustible && !form.observaciones.trim())
      e.observaciones = 'Debe justificar el motivo del despacho de combustible incompatible con el vehículo'

    const usados = new Set()
    lineas.forEach((linea, idx) => {
      if (!linea.producto_id) {
        e[`producto_${idx}`] = 'Seleccione un producto'
      } else {
        if (usados.has(linea.producto_id))
          e[`producto_${idx}`] = 'Producto duplicado en la lista'
        usados.add(linea.producto_id)
      }
      if (!linea.cantidad || Number(linea.cantidad) <= 0) {
        e[`cantidad_${idx}`] = 'Ingrese una cantidad válida'
      } else {
        const prod = productos.find(p => p.id === Number(linea.producto_id))
        if (prod && Number(linea.cantidad) > Number(prod.stock_actual))
          e[`cantidad_${idx}`] = `Máx. ${formatNumber(prod.stock_actual, 0)} ${prod.unidad}`
      }
    })
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setConfirmando(true)
  }

  async function handleConfirmar() {
    setSubmitting(true)
    try {
      const items = []
      for (const linea of lineas) {
        const prod = productos.find(p => p.id === Number(linea.producto_id))
        const despacho = await crearDespacho({
          vehiculo_id:     form.vehiculo_id,
          producto_id:     Number(linea.producto_id),
          cantidad:        Number(linea.cantidad),
          unidad:          prod.unidad,
          despachado_por:  user?.id ?? 2,
          solicitado_por:  form.solicitado_por,
          cedula_receptor: form.cedula_receptor || null,
          km_vehiculo:     form.km_vehiculo ? Math.round(Number(form.km_vehiculo)) : null,
          observaciones:   form.observaciones || null,
        })
        items.push({ despacho, producto: prod })
      }
      setConfirmando(false)
      setTicket({
        items,
        vehiculo:    selectedVehiculo,
        despachador: user ? `${user.nombre} ${user.apellido}` : 'Sistema',
      })
    } catch (err) {
      setConfirmando(false)
      setErrors({ submit: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setLineas([newLinea()])
    setSelectedVehiculo(null)
    setVehiculoSearch('')
    setErrors({})
    setTicket(null)
  }

  const dep = selectedVehiculo
    ? dependencias.find(d => d.id === selectedVehiculo.dependencia_id)
    : null

  const categorias = {}
  productos.forEach(p => {
    if (!categorias[p.categoria]) categorias[p.categoria] = []
    categorias[p.categoria].push(p)
  })

  // ── Ticket ────────────────────────────────────────────────────────────────
  if (ticket) {
    return (
      <TicketView
        ticket={ticket}
        depTicket={dependencias.find(d => d.id === ticket.vehiculo?.dependencia_id)}
        onReset={resetForm}
      />
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Nuevo Despacho</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Complete los datos para registrar el despacho</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vehículo */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-600" />
              Vehículo
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {!selectedVehiculo && (
              <div className="relative">
                <Input
                  ref={searchRef}
                  label="Buscar por ficha, matrícula o marca"
                  placeholder="Ej: F-012, A-12345 o Toyota"
                  value={vehiculoSearch}
                  onChange={e => { setVehiculoSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => vehiculoSearch && setShowDropdown(true)}
                  icon={<Search className="w-4 h-4" />}
                  error={errors.vehiculo_id}
                />
                {showDropdown && filteredVehiculos.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden"
                  >
                    {filteredVehiculos.map(v => {
                      const d = dependencias.find(d => d.id === v.dependencia_id)
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVehiculoSelect(v)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div className="shrink-0 w-28">
                            <p className="font-plate font-bold text-primary-600 text-lg leading-none">{v.placa}</p>
                            {v.matricula && <p className="font-plate text-xs text-slate-500 mt-0.5">{v.matricula}</p>}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v.marca} {v.modelo} <span className="text-slate-400">({v.anio})</span></p>
                            <p className="text-xs text-slate-500">{TIPO_ICON[v.tipo] ?? '⚙'} {d?.nombre ?? '—'}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                {showDropdown && vehiculoSearch && filteredVehiculos.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 text-sm text-slate-500 text-center">
                    No se encontraron vehículos activos
                  </div>
                )}
              </div>
            )}

            {selectedVehiculo && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <div className="text-3xl">{TIPO_ICON[selectedVehiculo.tipo] ?? '⚙'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3">
                    <p className="font-plate font-bold text-primary-600 text-2xl leading-none">{selectedVehiculo.placa}</p>
                    {selectedVehiculo.ficha_vieja && (
                      <span className="font-plate text-sm text-slate-400">Ficha ant.: {selectedVehiculo.ficha_vieja}</span>
                    )}
                  </div>
                  {selectedVehiculo.matricula && (
                    <p className="font-plate text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Matrícula: {selectedVehiculo.matricula}</p>
                  )}
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">{selectedVehiculo.marca} {selectedVehiculo.modelo} — {selectedVehiculo.anio}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                    <span>{selectedVehiculo.tipo}</span>
                    {selectedVehiculo.color && <><span>·</span><span>{selectedVehiculo.color}</span></>}
                    {dep?.nombre && <><span>·</span><span>{dep.nombre}</span></>}
                    {selectedVehiculo.combustible && (
                      <>
                        <span>·</span>
                        <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                          selectedVehiculo.combustible === 'Gasolina' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          selectedVehiculo.combustible === 'Gasoil'   ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          selectedVehiculo.combustible === 'Electrico'? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                          selectedVehiculo.combustible === 'Hibrido'  ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          ⛽ {selectedVehiculo.combustible}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button type="button" onClick={clearVehiculo} className="text-xs text-slate-500 hover:text-red-500 underline">
                  Cambiar
                </button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Productos y Cantidades */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Productos y Cantidades</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {lineas.map((linea, idx) => {
              const prod = productos.find(p => p.id === Number(linea.producto_id))
              return (
                <div
                  key={linea.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                >
                  {/* Header de línea */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Ítem {idx + 1}
                    </span>
                    {lineas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLinea(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar este ítem"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Selector de producto */}
                  {(() => {
                    const isDup = linea.producto_id &&
                      lineas.some((l, i) => i !== idx && l.producto_id === linea.producto_id)
                    return (
                  <Select
                    label="Producto"
                    value={linea.producto_id}
                    onChange={e => {
                      updateLinea(idx, 'producto_id', e.target.value)
                      updateLinea(idx, 'cantidad', '')
                      setErrors(ev => ({ ...ev, [`producto_${idx}`]: undefined, [`cantidad_${idx}`]: undefined }))
                    }}
                    error={errors[`producto_${idx}`] ?? (isDup ? 'Este producto ya está en otra línea' : undefined)}
                  >
                    <option value="">Seleccionar producto…</option>
                    {Object.entries(categorias).map(([cat, prods]) => (
                      <optgroup key={cat} label={CATEGORIA_LABELS[cat] ?? cat}>
                        {prods.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — Stock: {p.stock_actual} {p.unidad}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </Select>
                    )
                  })()}

                  {/* Info de stock */}
                  {prod && (
                    <div className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg text-sm',
                      prod.stock_actual <= prod.stock_minimo
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : prod.stock_actual <= prod.stock_minimo * 2
                          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    )}>
                      {prod.stock_actual <= prod.stock_minimo && (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium">
                          Stock disponible: {formatNumber(prod.stock_actual, 0)} {prod.unidad}
                        </span>
                        <span className="text-slate-500 ml-2">(mínimo: {prod.stock_minimo})</span>
                      </div>
                      <Badge variant={stockVariant(prod)}>
                        {prod.stock_actual <= 0 ? 'Sin stock'
                          : prod.stock_actual <= prod.stock_minimo ? 'Stock crítico'
                          : prod.stock_actual <= prod.stock_minimo * 2 ? 'Stock bajo'
                          : 'Stock OK'}
                      </Badge>
                    </div>
                  )}

                  {/* Aviso despacho reciente — solo primer ítem */}
                  {idx === 0 && despachoSemana && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-300">Despacho reciente detectado</p>
                        <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                          Este vehículo ya recibió <strong>{despachoSemana.producto_nombre}</strong> el{' '}
                          <strong>{formatDateTime(despachoSemana.fecha_despacho)}</strong> ({despachoSemana.cantidad} {despachoSemana.unidad}).
                          Ingrese una observación obligatoria.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Alerta de combustible incompatible */}
                  {(() => {
                    const conflicto = detectarConflictoCombustible(prod, selectedVehiculo?.combustible)
                    if (!conflicto) return null
                    return (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-red-800 dark:text-red-300">⚠ Combustible incompatible</p>
                          <p className="text-red-700 dark:text-red-400 mt-0.5">
                            {conflicto}. El vehículo está registrado como <strong>{selectedVehiculo.combustible}</strong>.
                            Debe justificar este despacho en el campo de observaciones.
                          </p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Cantidad */}
                  <div className="flex gap-3 items-end">
                    <Input
                      label="Cantidad"
                      type="number"
                      min="1"
                      max={prod?.stock_actual}
                      step="1"
                      value={linea.cantidad}
                      onChange={e => {
                        updateLinea(idx, 'cantidad', e.target.value)
                        setErrors(ev => ({ ...ev, [`cantidad_${idx}`]: undefined }))
                      }}
                      error={errors[`cantidad_${idx}`]}
                      className="flex-1"
                      placeholder="0"
                    />
                    {prod && (
                      <div className="pb-2.5">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{prod.unidad}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Botón agregar ítem */}
            <button
              type="button"
              onClick={addLinea}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar otro producto
            </button>
          </CardBody>
        </Card>

        {/* Datos del receptor */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Datos del Receptor</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Solicitado por *"
              placeholder="Nombre completo"
              value={form.solicitado_por}
              onChange={e => {
                setForm(f => ({ ...f, solicitado_por: e.target.value }))
                setErrors(ev => ({ ...ev, solicitado_por: undefined }))
              }}
              error={errors.solicitado_por}
            />
            <Input
              label="Cédula del receptor"
              placeholder="XXX-XXXXXXX-X"
              value={form.cedula_receptor}
              onChange={e => setForm(f => ({ ...f, cedula_receptor: e.target.value }))}
              mono
            />
            <Input
              label="Km del vehículo"
              type="number"
              min="0"
              step="1"
              placeholder="Ej: 45230"
              value={form.km_vehiculo}
              onChange={e => setForm(f => ({ ...f, km_vehiculo: e.target.value }))}
            />
          </CardBody>
        </Card>

        {/* Observaciones */}
        {(() => {
          const hayConflicto = lineas.some(linea => {
            const prod = productos.find(p => p.id === Number(linea.producto_id))
            return !!detectarConflictoCombustible(prod, selectedVehiculo?.combustible)
          })
          const esRequerido = despachoSemana || hayConflicto
          const placeholder = hayConflicto
            ? 'Justifique el motivo del despacho de combustible incompatible con el vehículo…'
            : despachoSemana
              ? 'Explique el motivo del despacho repetido esta semana…'
              : 'Notas adicionales (opcional)'
          return (
            <Card className={clsx(
              hayConflicto ? 'border-red-400 dark:border-red-600' : despachoSemana ? 'border-amber-300 dark:border-amber-700' : ''
            )}>
              <CardBody>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Observaciones {esRequerido && <span className="text-red-500">*</span>}
                    {hayConflicto && (
                      <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">(requerido — combustible incompatible)</span>
                    )}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={placeholder}
                    value={form.observaciones}
                    onChange={e => {
                      setForm(f => ({ ...f, observaciones: e.target.value }))
                      setErrors(ev => ({ ...ev, observaciones: undefined }))
                    }}
                    className={clsx(
                      'w-full rounded-lg border px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none',
                      errors.observaciones
                        ? 'border-red-400 dark:border-red-600 focus:ring-red-500/30 focus:border-red-500'
                        : hayConflicto
                          ? 'border-red-400 dark:border-red-600 focus:ring-red-500/30 focus:border-red-500'
                          : despachoSemana
                            ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-500/30 focus:border-amber-500'
                            : 'border-slate-200 dark:border-slate-600 focus:ring-primary-600/40 focus:border-primary-600'
                    )}
                  />
                  {errors.observaciones && (
                    <p className="text-xs text-red-500 mt-0.5">{errors.observaciones}</p>
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })()}

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errors.submit}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          icon={<ClipboardCheck className="w-5 h-5" />}
        >
          Revisar y Registrar
        </Button>
      </form>

      {/* Modal de confirmación */}
      <Modal open={confirmando} onClose={() => setConfirmando(false)} title="Confirmar Despacho" size="md">
        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revise los datos antes de confirmar. Una vez registrado no se puede modificar.
          </p>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
            {/* Vehículo */}
            <div className="bg-slate-50 dark:bg-slate-900/40 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">Vehículo</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Placa</p>
                <p className="font-plate font-bold text-primary-600 text-lg leading-none">{selectedVehiculo?.placa}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Vehículo</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{selectedVehiculo?.marca} {selectedVehiculo?.modelo}</p>
                <p className="text-xs text-slate-400">{selectedVehiculo?.anio} · {selectedVehiculo?.tipo}</p>
              </div>
              {dep && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Dependencia</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{dep.nombre}</p>
                </div>
              )}
            </div>

            {/* Productos */}
            <div className="bg-slate-50 dark:bg-slate-900/40 px-4 py-2 border-t border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">
                Productos ({lineas.length})
              </p>
            </div>
            {lineas.map((linea, idx) => {
              const prod = productos.find(p => p.id === Number(linea.producto_id))
              return (
                <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{prod?.nombre}</p>
                    <Badge variant={CATEGORIA_BADGE[prod?.categoria] ?? 'neutral'} className="mt-1">
                      {CATEGORIA_LABELS[prod?.categoria] ?? prod?.categoria}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-primary-600 leading-none">{formatNumber(Number(linea.cantidad), 0)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{prod?.unidad}</p>
                  </div>
                </div>
              )
            })}

            {/* Receptor */}
            <div className="bg-slate-50 dark:bg-slate-900/40 px-4 py-2 border-t border-b border-slate-200 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wide">Receptor</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Solicitado por</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{form.solicitado_por}</p>
              </div>
              {form.cedula_receptor && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Cédula</p>
                  <p className="font-plate text-slate-800 dark:text-slate-200">{form.cedula_receptor}</p>
                </div>
              )}
              {form.km_vehiculo && (
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Km vehículo</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{formatNumber(Number(form.km_vehiculo), 0)} km</p>
                </div>
              )}
              {form.observaciones && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-0.5">Observaciones</p>
                  <p className="text-slate-700 dark:text-slate-300">{form.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:border-primary-500 hover:text-primary-600 transition-colors"
            >
              Editar
            </button>
            <Button variant="primary" className="flex-1 rounded-xl" loading={submitting} onClick={handleConfirmar}
              icon={<CheckCircle className="w-4 h-4" />}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
