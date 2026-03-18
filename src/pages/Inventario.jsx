import { useState } from 'react'
import { Plus, Package, Power, Edit2 } from 'lucide-react'
import clsx from 'clsx'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORIA_LABELS, formatDateTime, formatNumber } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card from '../components/ui/Card'
import AccessDenied from '../components/ui/AccessDenied'
import ExportMenu from '../components/ui/ExportMenu'
import { exportInventarioPDF } from '../lib/exportPdf'
import { exportInventarioCSV } from '../lib/exportCsv'

const CATEGORIAS = ['combustible', 'aceite_motor', 'aceite_transmision', 'repuesto', 'otro']

const CATEGORIA_BADGE = {
  combustible:        'info',
  aceite_motor:       'warning',
  aceite_transmision: 'gold',
  repuesto:           'neutral',
  otro:               'neutral',
}

const EMPTY_PROD_FORM = { nombre: '', categoria: 'combustible', categoriaCustom: '', unidad: '', stock_minimo: '', precio_unitario: '' }

function prodFormFromProducto(p) {
  const isCustom = !CATEGORIAS.includes(p.categoria)
  return {
    nombre:         p.nombre,
    categoria:      isCustom ? 'otro' : p.categoria,
    categoriaCustom: isCustom ? p.categoria : '',
    unidad:         p.unidad,
    stock_minimo:   String(p.stock_minimo),
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

// ── Product Detail Modal ──────────────────────────────────────────────────────
function ProductDetailModal({ producto, auditoria, canEdit, onEntrada, onEdit, onToggle, onClose }) {
  if (!producto) return null

  const movimientos = auditoria
    .filter(a => a.tabla === 'productos' && a.registro_id === producto.id)
    .slice(0, 8)

  const variant = stockVariant(producto)

  return (
    <Modal
      open={!!producto}
      onClose={onClose}
      title={`${producto.nombre}`}
      size="lg"
    >
      <div className="p-6 space-y-5">
        {/* Info grid */}
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

        {/* Últimos movimientos */}
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

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          {canEdit && (
            <Button
              size="sm"
              variant={producto.activo !== false ? 'danger' : 'secondary'}
              icon={<Power className="w-3.5 h-3.5" />}
              onClick={() => {
                if (confirm(`¿${producto.activo !== false ? 'Desactivar' : 'Activar'} el producto "${producto.nombre}"?`)) {
                  onToggle()
                }
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
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Inventario() {
  const { productos, auditoria, registrarEntrada, crearProducto, editarProducto, toggleProductoActivo } = useData()
  const { hasPermiso } = useAuth()
  const canEdit = hasPermiso('inventario.editar')

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

  // Create/Edit modal
  const [formOpen,    setFormOpen]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [formData,    setFormData]    = useState(EMPTY_PROD_FORM)
  const [formErrors,  setFormErrors]  = useState({})
  const [formSaving,  setFormSaving]  = useState(false)

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
      setCantError(err?.response?.data?.error ?? 'Error al registrar entrada')
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
      setFormErrors({ nombre: err?.response?.data?.error ?? 'Error al guardar' })
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
        <div className="flex items-center gap-2">
          <ExportMenu onPDF={() => exportInventarioPDF(productos)} onCSV={() => exportInventarioCSV(productos)} />
          {canEdit && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Nuevo Producto
            </Button>
          )}
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
          const variant = stockVariant(p)
          return (
            <Card
              key={p.id}
              className={clsx('overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow', !p.activo && 'opacity-60')}
              onClick={() => setDetailProd(p)}
            >
              <div className="p-4 flex-1 flex flex-col">
                {/* Category + name */}
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
                </div>

                {/* Bar */}
                <StockBar producto={p} />
                <p className="text-xs text-slate-400 mt-1.5 mb-3">Mínimo: {p.stock_minimo} {p.unidad}</p>

                {/* Entrada button only */}
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
    </div>
  )
}
