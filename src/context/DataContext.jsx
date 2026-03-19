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

  // Recarga solo productos (ligero, para stock siempre fresco)
  const reloadProductos = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await api.get('/productos')
      setProductos(res.data)
    } catch (err) {
      console.error('[reloadProductos]', err.message)
    }
  }, [isAuthenticated])

  useEffect(() => { reload() }, [reload])

  // ── Despachos ────────────────────────────────────────────────────────────
  const loadDespachos = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await api.get(`/despachos${qs ? '?' + qs : ''}`)
    setDespachos(res.data)
    return res
  }, [])

  const crearDespacho = useCallback(async (data) => {
    const nuevo = await api.post('/despachos', data)
    setDespachos(prev => [nuevo, ...prev])
    // Actualización optimista inmediata para UI responsiva
    setProductos(prev => prev.map(p =>
      p.id === data.producto_id
        ? { ...p, stock_actual: Number(p.stock_actual) - Number(data.cantidad) }
        : p
    ))
    // Refrescar stock real del servidor en segundo plano —
    // garantiza que todos los usuarios vean el stock correcto
    // aunque haya otros despachos concurrentes en curso
    api.get('/productos')
      .then(res => setProductos(res.data))
      .catch(err => console.error('[crearDespacho refresh]', err.message))
    return nuevo
  }, [])

  // ── Inventario ───────────────────────────────────────────────────────────
  const registrarEntrada = useCallback(async (productoId, cantidad, notas = '') => {
    const updated = await api.post(`/productos/${productoId}/entrada`, { cantidad, notas })
    setProductos(prev => prev.map(p => p.id === updated.id ? updated : p))
  }, [])

  const editarProducto = useCallback(async (id, data) => {
    const updated = await api.put(`/productos/${id}`, data)
    setProductos(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }, [])

  const crearProducto = useCallback(async (data) => {
    const nuevo = await api.post('/productos', data)
    setProductos(prev => [...prev, nuevo])
    return nuevo
  }, [])

  const toggleProductoActivo = useCallback(async (id) => {
    const updated = await api.patch(`/productos/${id}/toggle`)
    setProductos(prev => prev.map(p => p.id === id ? updated : p))
  }, [])

  const importarProductos = useCallback(async (items) => {
    const result = await api.post('/productos/importar', { items })
    setProductos(result.productos)
    return result
  }, [])

  const loadMovimientos = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api.get(`/productos/movimientos${qs ? '?' + qs : ''}`)
  }, [])

  // ── Vehículos ────────────────────────────────────────────────────────────
  const crearVehiculo = useCallback(async (data) => {
    const nuevo = await api.post('/vehiculos', data)
    setVehiculos(prev => [...prev, nuevo])
    return nuevo
  }, [])

  const editarVehiculo = useCallback(async (id, data) => {
    const updated = await api.put(`/vehiculos/${id}`, data)
    setVehiculos(prev => prev.map(v => v.id === id ? updated : v))
  }, [])

  const toggleVehiculoActivo = useCallback(async (id) => {
    const updated = await api.patch(`/vehiculos/${id}/toggle`)
    setVehiculos(prev => prev.map(v => v.id === id ? updated : v))
  }, [])

  // ── Dependencias ─────────────────────────────────────────────────────────
  const crearDependencia = useCallback(async (data) => {
    const nuevo = await api.post('/dependencias', data)
    setDependencias(prev => [...prev, nuevo])
    return nuevo
  }, [])

  const editarDependencia = useCallback(async (id, data) => {
    const updated = await api.put(`/dependencias/${id}`, data)
    setDependencias(prev => prev.map(d => d.id === id ? updated : d))
  }, [])

  const toggleDependenciaActivo = useCallback(async (id) => {
    const updated = await api.patch(`/dependencias/${id}/toggle`)
    setDependencias(prev => prev.map(d => d.id === id ? updated : d))
  }, [])

  // ── Usuarios ─────────────────────────────────────────────────────────────
  const loadUsuarios = useCallback(async () => {
    const res = await api.get('/usuarios')
    setUsuarios(res.data)
  }, [])

  const crearUsuario = useCallback(async (data) => {
    const nuevo = await api.post('/usuarios', data)
    setUsuarios(prev => [...prev, nuevo])
    return nuevo
  }, [])

  const editarUsuario = useCallback(async (id, data) => {
    const updated = await api.put(`/usuarios/${id}`, data)
    setUsuarios(prev => prev.map(u => u.id === id ? updated : u))
  }, [])

  const toggleUsuarioActivo = useCallback(async (id) => {
    const updated = await api.patch(`/usuarios/${id}/toggle`)
    setUsuarios(prev => prev.map(u => u.id === id ? updated : u))
  }, [])

  const eliminarUsuario = useCallback(async (id) => {
    await api.delete(`/usuarios/${id}`)
    setUsuarios(prev => prev.filter(u => u.id !== id))
  }, [])

  // ── Auditoría ─────────────────────────────────────────────────────────────
  const loadAuditoria = useCallback(async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const res = await api.get(`/auditoria${qs ? '?' + qs : ''}`)
    setAuditoria(res.data)
    return res
  }, [])

  return (
    <DataContext.Provider value={{
      // state
      despachos, productos, vehiculos, dependencias, usuarios, auditoria, loading,
      // loaders
      reload, reloadProductos, loadDespachos, loadUsuarios, loadAuditoria,
      // despachos
      crearDespacho,
      // inventario
      registrarEntrada, crearProducto, editarProducto, toggleProductoActivo, importarProductos, loadMovimientos,
      // vehículos
      crearVehiculo, editarVehiculo, toggleVehiculoActivo,
      // dependencias
      crearDependencia, editarDependencia, toggleDependenciaActivo,
      // usuarios
      crearUsuario, editarUsuario, toggleUsuarioActivo, eliminarUsuario,
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
