import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const TOKEN_KEY = 'uasd_token'
const USER_KEY  = 'uasd_user'

// Mock user for development (remove when backend is ready)
const MOCK_USERS = [
  { id: 1, nombre: 'Admin', apellido: 'Sistema', email: 'admin@uasd.edu.do', rol: 'admin',       avatar_url: null },
  { id: 2, nombre: 'Juan',  apellido: 'Pérez',   email: 'juan@uasd.edu.do',  rol: 'despachador', avatar_url: null },
  { id: 3, nombre: 'María', apellido: 'Gómez',   email: 'maria@uasd.edu.do', rol: 'supervisor',  avatar_url: null },
]

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(false)

  const isAuthenticated = !!token && !!user

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      // TODO: replace with real API call
      await new Promise(r => setTimeout(r, 600)) // simulate network
      const found = MOCK_USERS.find(u => u.email === email)
      if (!found || password !== 'Admin@2024') {
        throw new Error('Credenciales incorrectas')
      }
      const fakeToken = btoa(JSON.stringify({ id: found.id, exp: Date.now() + 8 * 3600 * 1000 }))
      localStorage.setItem(TOKEN_KEY, fakeToken)
      localStorage.setItem(USER_KEY, JSON.stringify(found))
      setToken(fakeToken)
      setUser(found)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.rol)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
