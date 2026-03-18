import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

// Solo el objeto user (no-sensible) se persiste en localStorage para UX
const USER_KEY = 'uasd_user'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)

  // Al montar, verificar sesión con el servidor (la cookie httpOnly es la fuente de verdad)
  useEffect(() => {
    api.get('/auth/me')
      .then(u => { setUser(u); localStorage.setItem(USER_KEY, JSON.stringify(u)) })
      .catch(() => { setUser(null); localStorage.removeItem(USER_KEY) })
      .finally(() => setVerified(true))
  }, [])

  const isAuthenticated = !!user

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await api.post('/auth/login', { email, password })
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setUser(data.user)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {})
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.rol)
  }, [user])

  // admin siempre tiene acceso total; otros usuarios dependen de su lista de permisos
  const hasPermiso = useCallback((permiso) => {
    if (!user) return false
    if (user.rol === 'admin') return true
    if (!permiso) return true
    return (user.permisos ?? []).includes(permiso)
  }, [user])

  // Heartbeat de presencia: actualiza last_seen cada 60s mientras el usuario está activo
  useEffect(() => {
    if (!isAuthenticated) return
    api.post('/auth/ping').catch(() => {})
    const id = setInterval(() => api.post('/auth/ping').catch(() => {}), 60_000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  // Mientras se verifica la sesión inicial, no renderizar children para evitar flash
  if (!verified) return null

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, hasRole, hasPermiso }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
