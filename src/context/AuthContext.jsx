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

  // Mientras se verifica la sesión inicial, no renderizar children para evitar flash
  if (!verified) return null

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
