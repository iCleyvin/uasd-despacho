import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Printer, RotateCcw, Search, AlertTriangle, Truck } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Input, { Select } from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Card, { CardHeader, CardBody } from '../components/ui/Card'

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

const TIPO_ICON = {
  sedan:       '🚗',
  pickup:      '🛻',
  camion:      '🚛',
  autobus:     '🚌',
  motocicleta: '🏍',
  otro:        '⚙',
}

function stockVariant(producto) {
  if (!producto) return 'neutral'
  if (producto.stock_actual <= 0) return 'danger'
  if (producto.stock_actual <= producto.stock_minimo) return 'danger'
  if (producto.stock_actual <= producto.stock_minimo * 2) return 'warning'
  return 'success'
}

const EMPTY_FORM = {
  vehiculo_id:     null,
  producto_id:     '',
  cantidad:        '',
  solicitado_por:  '',
  cedula_receptor: '',
  km_vehiculo:     '',
  observaciones:   '',
}

export default function NuevoDespacho() {
  const { user } = useAuth()
  const { vehiculos, productos, dependencias, crearDespacho } = useData()

  const [form, setForm]             = useState(EMPTY_FORM)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [vehiculoSearch, setVehiculoSearch]     = useState('')
  const [showDropdown, setShowDropdown]         = useState(false)
  const [errors, setErrors]         = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [ticket, setTicket]         = useState(null)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)

  const filteredVehiculos = vehiculos.filter(v => {
    if (!vehiculoSearch.trim()) return false
    const q = vehiculoSearch.toLowerCase()
    return (
      v.placa.toLowerCase().includes(q) ||
      v.marca.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q)
    )
  }).filter(v => v.activo)

  const productoSeleccionado = productos.find(p => p.id === Number(form.producto_id))

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

  function validate() {
    const e = {}
    if (!form.vehiculo_id)    e.vehiculo_id = 'Seleccione un vehículo'
    if (!form.producto_id)    e.producto_id = 'Seleccione un producto'
    if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Ingrese una cantidad válida'
    if (productoSeleccionado && Number(form.cantidad) > productoSeleccionado.stock_actual)
      e.cantidad = `Stock insuficiente. Disponible: ${productoSeleccionado.stock_actual} ${productoSeleccionado.unidad}`
    if (!form.solicitado_por.trim()) e.solicitado_por = 'Campo requerido'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setSubmitting(true)
    try {
      const despacho = await crearDespacho({
        vehiculo_id:     form.vehiculo_id,
        producto_id:     Number(form.producto_id),
        cantidad:        Number(form.cantidad),
        unidad:          productoSeleccionado.unidad,
        despachado_por:  user?.id ?? 2,
        solicitado_por:  form.solicitado_por,
        cedula_receptor: form.cedula_receptor || null,
        km_vehiculo:     form.km_vehiculo ? Number(form.km_vehiculo) : null,
        observaciones:   form.observaciones || null,
      })
      setTicket({
        despacho,
        vehiculo:  selectedVehiculo,
        producto:  productoSeleccionado,
        despachador: user ? `${user.nombre} ${user.apellido}` : 'Sistema',
      })
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setSelectedVehiculo(null)
    setVehiculoSearch('')
    setErrors({})
    setTicket(null)
  }

  function handlePrint() {
    window.print()
  }

  const dep = selectedVehiculo
    ? dependencias.find(d => d.id === selectedVehiculo.dependencia_id)
    : null

  // ── Ticket de confirmación ────────────────────────────────────────────────
  if (ticket) {
    const { despacho, vehiculo, producto, despachador } = ticket
    const depTicket = dependencias.find(d => d.id === vehiculo?.dependencia_id)
    return (
      <div className="max-w-lg mx-auto py-8 px-4">
        <Card className="overflow-hidden">
          <div className="bg-primary-600 px-6 py-5 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-white font-display font-bold text-xl">Despacho Registrado</h1>
              <p className="text-primary-200 text-sm">#{String(despacho.id).padStart(6, '0')}</p>
            </div>
          </div>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Fecha y hora</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{formatDateTime(despacho.fecha_despacho)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Vehículo</p>
                <p className="font-plate font-bold text-slate-900 dark:text-slate-100">{vehiculo?.placa}</p>
                <p className="text-xs text-slate-500">{vehiculo?.marca} {vehiculo?.modelo}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Producto</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{producto?.nombre}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Cantidad</p>
                <p className="font-bold text-2xl text-primary-600">{formatNumber(despacho.cantidad, 0)}</p>
                <p className="text-xs text-slate-500">{despacho.unidad}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Solicitado por</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{despacho.solicitado_por}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Despachado por</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">{despachador}</p>
              </div>
              {despacho.cedula_receptor && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Cédula receptor</p>
                  <p className="font-plate text-slate-900 dark:text-slate-100">{despacho.cedula_receptor}</p>
                </div>
              )}
              {despacho.km_vehiculo && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Km vehículo</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(despacho.km_vehiculo, 0)} km</p>
                </div>
              )}
              {depTicket && (
                <div className="col-span-2">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Dependencia</p>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{depTicket.nombre}</p>
                </div>
              )}
              {despacho.observaciones && (
                <div className="col-span-2">
                  <p className="text-slate-500 dark:text-slate-400 text-xs uppercase font-medium mb-0.5">Observaciones</p>
                  <p className="text-slate-700 dark:text-slate-300">{despacho.observaciones}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint} className="flex-1">
                Imprimir
              </Button>
              <Button variant="primary" icon={<RotateCcw className="w-4 h-4" />} onClick={resetForm} className="flex-1">
                Nuevo Despacho
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  const categorias = {}
  productos.forEach(p => {
    if (!categorias[p.categoria]) categorias[p.categoria] = []
    categorias[p.categoria].push(p)
  })

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
            {/* Búsqueda */}
            {!selectedVehiculo && (
              <div className="relative">
                <Input
                  ref={searchRef}
                  label="Buscar por placa o marca"
                  placeholder="Ej: A-12345 o Toyota"
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
                          <span className="font-plate font-bold text-primary-600 text-lg w-24 shrink-0">{v.placa}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{v.marca} {v.modelo} <span className="text-slate-400">({v.año})</span></p>
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

            {/* Vehículo seleccionado */}
            {selectedVehiculo && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <div className="text-3xl">{TIPO_ICON[selectedVehiculo.tipo] ?? '⚙'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-plate font-bold text-primary-600 text-2xl leading-none">{selectedVehiculo.placa}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">{selectedVehiculo.marca} {selectedVehiculo.modelo} — {selectedVehiculo.año}</p>
                  <p className="text-xs text-slate-500">{selectedVehiculo.tipo} · {selectedVehiculo.color} · {dep?.nombre}</p>
                </div>
                <button
                  type="button"
                  onClick={clearVehiculo}
                  className="text-xs text-slate-500 hover:text-red-500 underline"
                >
                  Cambiar
                </button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Producto & Cantidad */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Producto y Cantidad</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Select
              label="Producto"
              value={form.producto_id}
              onChange={e => {
                setForm(f => ({ ...f, producto_id: e.target.value, cantidad: '' }))
                setErrors(ev => ({ ...ev, producto_id: undefined, cantidad: undefined }))
              }}
              error={errors.producto_id}
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

            {/* Info de stock */}
            {productoSeleccionado && (
              <div className={clsx(
                'flex items-center gap-3 p-3 rounded-lg text-sm',
                productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo * 2
                    ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                    : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              )}>
                {productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo && (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-medium">
                    Stock disponible: {formatNumber(productoSeleccionado.stock_actual, 0)} {productoSeleccionado.unidad}
                  </span>
                  <span className="text-slate-500 ml-2">(mínimo: {productoSeleccionado.stock_minimo})</span>
                </div>
                <Badge variant={stockVariant(productoSeleccionado)}>
                  {productoSeleccionado.stock_actual <= 0
                    ? 'Sin stock'
                    : productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo
                      ? 'Stock crítico'
                      : productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo * 2
                        ? 'Stock bajo'
                        : 'Stock OK'}
                </Badge>
              </div>
            )}

            <div className="flex gap-3 items-end">
              <Input
                label="Cantidad"
                type="number"
                min="1"
                max={productoSeleccionado?.stock_actual}
                step="1"
                value={form.cantidad}
                onChange={e => {
                  setForm(f => ({ ...f, cantidad: e.target.value }))
                  setErrors(ev => ({ ...ev, cantidad: undefined }))
                }}
                error={errors.cantidad}
                className="flex-1"
                placeholder="0"
              />
              {productoSeleccionado && (
                <div className="pb-2.5">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{productoSeleccionado.unidad}</span>
                </div>
              )}
            </div>
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
              placeholder="Ej: 45230"
              value={form.km_vehiculo}
              onChange={e => setForm(f => ({ ...f, km_vehiculo: e.target.value }))}
            />
          </CardBody>
        </Card>

        {/* Observaciones */}
        <Card>
          <CardBody>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Observaciones</label>
              <textarea
                rows={3}
                placeholder="Notas adicionales (opcional)"
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600 transition-all resize-none"
              />
            </div>
          </CardBody>
        </Card>

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
          loading={submitting}
          className="w-full"
        >
          Registrar Despacho
        </Button>
      </form>
    </div>
  )
}
