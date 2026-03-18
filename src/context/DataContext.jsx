import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth()

  const [despachos,    setDespachos]    = useState([])
  const [productos,    setProductos]    = useState([])
  const [vehiculos,    setVehiculos]    = useState([])
  const [dependencias, setDependencias] = useState([])
  const [usuarios,     setUsuarios]     = useState([])
  const [auditoria,    setAuditoria]    = useState([])
  const [loading,      setLoading]      = useState(false)

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const [deps, prods, vehs] = await Promise.all([
        api.get('/dependencias'),
        api.get('/productos'),
        api.get('/vehiculos'),
      ])
      setDependencias(deps.data)
      setProductos(prods.data)
      setVehiculos(vehs.data)
    } catch (err) {
      console.error('Error cargando datos:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { reload() }, [reload])

  // ── Despachos ────────────────────────────────────────────────────────────
  async function loadDespachos(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const res = await api.get(`/despachos${qs ? '?' + qs : ''}`)
    setDespachos(res.data)
    return res
  }

  async function crearDespacho(data) {
    const nuevo = await api.post('/despachos', data)
    setDespachos(prev => [nuevo, ...prev])
    // Actualizar stock del producto en local
    setProductos(prev => prev.map(p =>
      p.id === data.producto_id
        ? { ...p, stock_actual: Number(p.stock_actual) - Number(data.cantidad) }
        : p
    ))
    return nuevo
  }

  // ── Inventario ───────────────────────────────────────────────────────────
  async function registrarEntrada(productoId, cantidad, notas = '') {
    const updated = await api.post(`/productos/${productoId}/entrada`, { cantidad, notas })
    setProductos(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  async function editarProducto(id, data) {
    const updated = await api.put(`/productos/${id}`, data)
    setProductos(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  async function crearProducto(data) {
    const nuevo = await api.post('/productos', data)
    setProductos(prev => [...prev, nuevo])
    return nuevo
  }

  async function toggleProductoActivo(id) {
    const updated = await api.patch(`/productos/${id}/toggle`)
    setProductos(prev => prev.map(p => p.id === id ? updated : p))
  }

  // ── Vehículos ────────────────────────────────────────────────────────────
  async function crearVehiculo(data) {
    const nuevo = await api.post('/vehiculos', data)
    setVehiculos(prev => [...prev, nuevo])
    return nuevo
  }

  async function editarVehiculo(id, data) {
    const updated = await api.put(`/vehiculos/${id}`, data)
    setVehiculos(prev => prev.map(v => v.id === id ? updated : v))
  }

  async function toggleVehiculoActivo(id) {
    const updated = await api.patch(`/vehiculos/${id}/toggle`)
    setVehiculos(prev => prev.map(v => v.id === id ? updated : v))
  }

  // ── Dependencias ─────────────────────────────────────────────────────────
  async function crearDependencia(data) {
    const nuevo = await api.post('/dependencias', data)
    setDependencias(prev => [...prev, nuevo])
    return nuevo
  }

  async function editarDependencia(id, data) {
    const updated = await api.put(`/dependencias/${id}`, data)
    setDependencias(prev => prev.map(d => d.id === id ? updated : d))
  }

  async function toggleDependenciaActivo(id) {
    const updated = await api.patch(`/dependencias/${id}/toggle`)
    setDependencias(prev => prev.map(d => d.id === id ? updated : d))
  }

  // ── Usuarios ─────────────────────────────────────────────────────────────
  async function loadUsuarios() {
    const res = await api.get('/usuarios')
    setUsuarios(res.data)
  }

  async function crearUsuario(data) {
    const nuevo = await api.post('/usuarios', data)
    setUsuarios(prev => [...prev, nuevo])
    return nuevo
  }

  async function editarUsuario(id, data) {
    const updated = await api.put(`/usuarios/${id}`, data)
    setUsuarios(prev => prev.map(u => u.id === id ? updated : u))
  }

  async function toggleUsuarioActivo(id) {
    const updated = await api.patch(`/usuarios/${id}/toggle`)
    setUsuarios(prev => prev.map(u => u.id === id ? updated : u))
  }

  // ── Auditoría ─────────────────────────────────────────────────────────────
  async function loadAuditoria(params = {}) {
    const qs = new URLSearchParams(params).toString()
    const res = await api.get(`/auditoria${qs ? '?' + qs : ''}`)
    setAuditoria(res.data)
    return res
  }

  return (
    <DataContext.Provider value={{
      // state
      despachos, productos, vehiculos, dependencias, usuarios, auditoria, loading,
      // loaders
      reload, loadDespachos, loadUsuarios, loadAuditoria,
      // despachos
      crearDespacho,
      // inventario
      registrarEntrada, crearProducto, editarProducto, toggleProductoActivo,
      // vehículos
      crearVehiculo, editarVehiculo, toggleVehiculoActivo,
      // dependencias
      crearDependencia, editarDependencia, toggleDependenciaActivo,
      // usuarios
      crearUsuario, editarUsuario, toggleUsuarioActivo,
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
