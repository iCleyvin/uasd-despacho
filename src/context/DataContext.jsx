import { createContext, useContext, useState, useEffect } from 'react'
import {
  DEPENDENCIAS,
  PRODUCTOS,
  VEHICULOS,
  DESPACHOS,
} from '../utils/mockData'

// Persist state to localStorage, seeding from mockData on first load
function usePersistedState(key, seed) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) return JSON.parse(stored)
    } catch {}
    return seed
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)) } catch {}
  }, [key, state])

  return [state, setState]
}

const DataContext = createContext(null)

const INITIAL_USUARIOS = [
  { id: 1, nombre: 'Admin',  apellido: 'Sistema', email: 'admin@uasd.edu.do', rol: 'admin',       activo: true, created_at: '2026-01-01T00:00:00' },
  { id: 2, nombre: 'Juan',   apellido: 'Pérez',   email: 'juan@uasd.edu.do',  rol: 'despachador', activo: true, created_at: '2026-01-15T00:00:00' },
  { id: 3, nombre: 'María',  apellido: 'Gómez',   email: 'maria@uasd.edu.do', rol: 'supervisor',  activo: true, created_at: '2026-02-01T00:00:00' },
]

const INITIAL_AUDITORIA = [
  { id: 1,  accion: 'CREATE', tabla: 'despachos',    registro_id: 1,  usuario_id: 2, created_at: '2026-03-15T08:30:00', datos_antes: null,                                                                    datos_nuevo: { vehiculo_id: 1, producto_id: 1, cantidad: 10 } },
  { id: 2,  accion: 'CREATE', tabla: 'despachos',    registro_id: 2,  usuario_id: 2, created_at: '2026-03-15T09:15:00', datos_antes: null,                                                                    datos_nuevo: { vehiculo_id: 3, producto_id: 3, cantidad: 4 } },
  { id: 3,  accion: 'UPDATE', tabla: 'productos',    registro_id: 1,  usuario_id: 2, created_at: '2026-03-15T08:30:01', datos_antes: { stock_actual: 460 },                                                  datos_nuevo: { stock_actual: 450 } },
  { id: 4,  accion: 'CREATE', tabla: 'despachos',    registro_id: 3,  usuario_id: 2, created_at: '2026-03-15T10:00:00', datos_antes: null,                                                                    datos_nuevo: { vehiculo_id: 2, producto_id: 2, cantidad: 15 } },
  { id: 5,  accion: 'UPDATE', tabla: 'vehiculos',    registro_id: 3,  usuario_id: 1, created_at: '2026-03-14T16:00:00', datos_antes: { activo: false },                                                      datos_nuevo: { activo: true } },
  { id: 6,  accion: 'CREATE', tabla: 'usuarios',     registro_id: 3,  usuario_id: 1, created_at: '2026-02-01T00:00:00', datos_antes: null,                                                                    datos_nuevo: { nombre: 'María', apellido: 'Gómez', rol: 'supervisor' } },
  { id: 7,  accion: 'ENTRADA', tabla: 'productos',   registro_id: 2,  usuario_id: 1, created_at: '2026-03-10T09:00:00', datos_antes: { stock_actual: 60 },                                                   datos_nuevo: { stock_actual: 80, cantidad_entrada: 20, notas: 'Compra mensual' } },
  { id: 8,  accion: 'CREATE', tabla: 'dependencias', registro_id: 8,  usuario_id: 1, created_at: '2026-01-10T10:00:00', datos_antes: null,                                                                    datos_nuevo: { nombre: 'Transporte', codigo: 'TRA' } },
  { id: 9,  accion: 'UPDATE', tabla: 'productos',    registro_id: 4,  usuario_id: 1, created_at: '2026-03-08T11:00:00', datos_antes: { stock_minimo: 30 },                                                   datos_nuevo: { stock_minimo: 50 } },
  { id: 10, accion: 'CREATE', tabla: 'despachos',    registro_id: 10, usuario_id: 2, created_at: '2026-03-10T08:45:00', datos_antes: null,                                                                    datos_nuevo: { vehiculo_id: 4, producto_id: 2, cantidad: 12 } },
]

export function DataProvider({ children }) {
  const [despachos,    setDespachos]    = usePersistedState('uasd_despachos',    DESPACHOS)
  const [productos,    setProductos]    = usePersistedState('uasd_productos',    PRODUCTOS)
  const [vehiculos,    setVehiculos]    = usePersistedState('uasd_vehiculos',    VEHICULOS)
  const [dependencias, setDependencias] = usePersistedState('uasd_dependencias', DEPENDENCIAS)
  const [usuarios,     setUsuarios]     = usePersistedState('uasd_usuarios',     INITIAL_USUARIOS)
  const [auditoria,    setAuditoria]    = usePersistedState('uasd_auditoria',    INITIAL_AUDITORIA)

  // ── helpers ──────────────────────────────────────────────────────────────
  function nextId(arr) {
    return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1
  }

  function addAudit({ accion, tabla, registro_id, usuario_id, datos_antes = null, datos_nuevo = null }) {
    const entry = {
      id:          0, // will be replaced below
      accion,
      tabla,
      registro_id,
      usuario_id:  usuario_id ?? 1,
      created_at:  new Date().toISOString(),
      datos_antes,
      datos_nuevo,
    }
    setAuditoria(prev => {
      const id = nextId(prev)
      return [{ ...entry, id }, ...prev]
    })
  }

  // ── despachos ─────────────────────────────────────────────────────────────
  function crearDespacho(data) {
    const producto = productos.find(p => p.id === data.producto_id)
    if (!producto) throw new Error('Producto no encontrado')
    if (data.cantidad > producto.stock_actual) throw new Error('Stock insuficiente')

    const id = nextId(despachos)
    const nuevo = {
      id,
      ...data,
      fecha_despacho: new Date().toISOString(),
    }

    setDespachos(prev => [nuevo, ...prev])

    const stockAntes = producto.stock_actual
    setProductos(prev =>
      prev.map(p =>
        p.id === data.producto_id
          ? { ...p, stock_actual: p.stock_actual - data.cantidad }
          : p
      )
    )

    addAudit({
      accion:      'CREATE',
      tabla:       'despachos',
      registro_id: id,
      usuario_id:  data.despachado_por,
      datos_nuevo: data,
    })
    addAudit({
      accion:      'UPDATE',
      tabla:       'productos',
      registro_id: data.producto_id,
      usuario_id:  data.despachado_por,
      datos_antes: { stock_actual: stockAntes },
      datos_nuevo: { stock_actual: stockAntes - data.cantidad },
    })

    return nuevo
  }

  // ── inventario ────────────────────────────────────────────────────────────
  function registrarEntrada(productoId, cantidad, notas = '') {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) throw new Error('Producto no encontrado')

    const stockAntes = producto.stock_actual
    setProductos(prev =>
      prev.map(p =>
        p.id === productoId
          ? { ...p, stock_actual: p.stock_actual + Number(cantidad) }
          : p
      )
    )

    addAudit({
      accion:      'ENTRADA',
      tabla:       'productos',
      registro_id: productoId,
      usuario_id:  1,
      datos_antes: { stock_actual: stockAntes },
      datos_nuevo: { stock_actual: stockAntes + Number(cantidad), cantidad_entrada: Number(cantidad), notas },
    })
  }

  // ── vehículos ─────────────────────────────────────────────────────────────
  function crearVehiculo(data) {
    const id = nextId(vehiculos)
    const nuevo = { id, activo: true, ...data }
    setVehiculos(prev => [...prev, nuevo])
    addAudit({ accion: 'CREATE', tabla: 'vehiculos', registro_id: id, datos_nuevo: data })
    return nuevo
  }

  function editarVehiculo(id, data) {
    setVehiculos(prev =>
      prev.map(v => (v.id === id ? { ...v, ...data } : v))
    )
    addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: id, datos_nuevo: data })
  }

  function toggleVehiculoActivo(id) {
    setVehiculos(prev =>
      prev.map(v => {
        if (v.id !== id) return v
        const next = { ...v, activo: !v.activo }
        addAudit({ accion: 'UPDATE', tabla: 'vehiculos', registro_id: id, datos_antes: { activo: v.activo }, datos_nuevo: { activo: next.activo } })
        return next
      })
    )
  }

  // ── dependencias ──────────────────────────────────────────────────────────
  function crearDependencia(data) {
    const id = nextId(dependencias)
    const nuevo = { id, activo: true, ...data }
    setDependencias(prev => [...prev, nuevo])
    addAudit({ accion: 'CREATE', tabla: 'dependencias', registro_id: id, datos_nuevo: data })
    return nuevo
  }

  function editarDependencia(id, data) {
    setDependencias(prev =>
      prev.map(d => (d.id === id ? { ...d, ...data } : d))
    )
    addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: id, datos_nuevo: data })
  }

  function toggleDependenciaActivo(id) {
    setDependencias(prev =>
      prev.map(d => {
        if (d.id !== id) return d
        const next = { ...d, activo: !d.activo }
        addAudit({ accion: 'UPDATE', tabla: 'dependencias', registro_id: id, datos_antes: { activo: d.activo }, datos_nuevo: { activo: next.activo } })
        return next
      })
    )
  }

  // ── usuarios ──────────────────────────────────────────────────────────────
  function crearUsuario(data) {
    const id = nextId(usuarios)
    const nuevo = { id, activo: true, created_at: new Date().toISOString(), ...data }
    setUsuarios(prev => [...prev, nuevo])
    addAudit({ accion: 'CREATE', tabla: 'usuarios', registro_id: id, datos_nuevo: { ...data, password: '[REDACTED]' } })
    return nuevo
  }

  function editarUsuario(id, data) {
    setUsuarios(prev =>
      prev.map(u => (u.id === id ? { ...u, ...data } : u))
    )
    addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: id, datos_nuevo: { ...data, password: data.password ? '[REDACTED]' : undefined } })
  }

  function toggleUsuarioActivo(id) {
    setUsuarios(prev =>
      prev.map(u => {
        if (u.id !== id) return u
        const next = { ...u, activo: !u.activo }
        addAudit({ accion: 'UPDATE', tabla: 'usuarios', registro_id: id, datos_antes: { activo: u.activo }, datos_nuevo: { activo: next.activo } })
        return next
      })
    )
  }

  return (
    <DataContext.Provider value={{
      // state
      despachos,
      productos,
      vehiculos,
      dependencias,
      usuarios,
      auditoria,
      // despachos
      crearDespacho,
      // inventario
      registrarEntrada,
      // vehículos
      crearVehiculo,
      editarVehiculo,
      toggleVehiculoActivo,
      // dependencias
      crearDependencia,
      editarDependencia,
      toggleDependenciaActivo,
      // usuarios
      crearUsuario,
      editarUsuario,
      toggleUsuarioActivo,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
