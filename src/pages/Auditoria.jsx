import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Eye, ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/format'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input, { Select } from '../components/ui/Input'
import Card, { CardBody } from '../components/ui/Card'

const PAGE_SIZE = 20

const ACCION_BADGE = {
  CREATE:  'success',
  UPDATE:  'info',
  DELETE:  'danger',
  ENTRADA: 'gold',
}

const TABLA_LABELS = {
  despachos:    'Despachos',
  productos:    'Productos',
  vehiculos:    'Vehículos',
  dependencias: 'Dependencias',
  usuarios:     'Usuarios',
}

export default function Auditoria() {
  const { user, hasRole } = useAuth()
  const { auditoria, usuarios } = useData()
  const navigate = useNavigate()

  const [filterUsuario, setFilterUsuario] = useState('')
  const [filterDesde,   setFilterDesde]   = useState('')
  const [filterHasta,   setFilterHasta]   = useState('')
  const [filterAccion,  setFilterAccion]  = useState('')
  const [page,          setPage]          = useState(1)
  const [selected,      setSelected]      = useState(null)

  // Redirect non-admin/supervisor
  if (!hasRole('admin', 'supervisor')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <ShieldOff className="w-12 h-12" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Solo administradores y supervisores pueden ver la auditoría.</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
      </div>
    )
  }

  const filtered = useMemo(() => {
    return auditoria.filter(a => {
      if (filterUsuario && a.usuario_id !== Number(filterUsuario)) return false
      if (filterDesde   && a.created_at < filterDesde) return false
      if (filterHasta   && a.created_at > filterHasta + 'T23:59:59') return false
      if (filterAccion  && !a.accion.toLowerCase().includes(filterAccion.toLowerCase())) return false
      return true
    }).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [auditoria, filterUsuario, filterDesde, filterHasta, filterAccion])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">Registro de Auditoría</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Historial de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardBody className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Usuario"
              value={filterUsuario}
              onChange={e => { setFilterUsuario(e.target.value); setPage(1) }}
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
              ))}
            </Select>
            <Input
              label="Desde"
              type="date"
              value={filterDesde}
              onChange={e => { setFilterDesde(e.target.value); setPage(1) }}
            />
            <Input
              label="Hasta"
              type="date"
              value={filterHasta}
              onChange={e => { setFilterHasta(e.target.value); setPage(1) }}
            />
            <Input
              label="Acción"
              placeholder="CREATE, UPDATE…"
              value={filterAccion}
              onChange={e => { setFilterAccion(e.target.value); setPage(1) }}
            />
          </div>
        </CardBody>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Fecha/Hora</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Usuario</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Acción</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Tabla</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Registro ID</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">No hay registros con los filtros seleccionados</td>
                </tr>
              )}
              {paginated.map(a => {
                const u = usuarios.find(u => u.id === a.usuario_id)
                return (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => setSelected(a)}
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(a.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {u ? `${u.nombre} ${u.apellido}` : `#${a.usuario_id}`}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ACCION_BADGE[a.accion] ?? 'neutral'}>{a.accion}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {TABLA_LABELS[a.tabla] ?? a.tabla}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 font-plate">#{a.registro_id}</td>
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
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Modal detalle */}
      <AuditoriaModal registro={selected} usuarios={usuarios} onClose={() => setSelected(null)} />
    </div>
  )
}

function JsonDiff({ antes, nuevo }) {
  if (!antes && !nuevo) return <p className="text-slate-400 text-sm">Sin datos de cambio.</p>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Datos anteriores</p>
        {antes ? (
          <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-x-auto border border-red-100 dark:border-red-800">
            {JSON.stringify(antes, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-slate-400 italic">— (nuevo registro)</p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Datos nuevos</p>
        {nuevo ? (
          <pre className="text-xs bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 rounded-lg overflow-x-auto border border-green-100 dark:border-green-800">
            {JSON.stringify(nuevo, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-slate-400 italic">— (registro eliminado)</p>
        )}
      </div>
    </div>
  )
}

function AuditoriaModal({ registro, usuarios, onClose }) {
  if (!registro) return null
  const u = usuarios.find(u => u.id === registro.usuario_id)
  return (
    <Modal open={!!registro} onClose={onClose} title={`Auditoría #${registro.id}`} size="xl">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Fecha/Hora</p>
            <p className="text-slate-800 dark:text-slate-200">{formatDateTime(registro.created_at)}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Usuario</p>
            <p className="font-medium text-slate-800 dark:text-slate-200">{u ? `${u.nombre} ${u.apellido}` : `#${registro.usuario_id}`}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Acción</p>
            <Badge variant={ACCION_BADGE[registro.accion] ?? 'neutral'}>{registro.accion}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Tabla</p>
            <p className="text-slate-800 dark:text-slate-200">{TABLA_LABELS[registro.tabla] ?? registro.tabla}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-medium text-slate-400 mb-0.5">Registro ID</p>
            <p className="font-plate text-slate-800 dark:text-slate-200">#{registro.registro_id}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Detalle del cambio</p>
          <JsonDiff antes={registro.datos_antes} nuevo={registro.datos_nuevo} />
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
