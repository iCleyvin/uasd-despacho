import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevoDespacho from './pages/NuevoDespacho'
import Despachos from './pages/Despachos'
import Inventario from './pages/Inventario'
import Vehiculos from './pages/Vehiculos'
import Dependencias from './pages/Dependencias'
import Reportes from './pages/Reportes'
import Auditoria from './pages/Auditoria'
import Usuarios from './pages/Usuarios'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />

      <Route element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"      element={<Dashboard />} />
        <Route path="/nuevo-despacho" element={<NuevoDespacho />} />
        <Route path="/despachos"      element={<Despachos />} />
        <Route path="/inventario"     element={<Inventario />} />
        <Route path="/vehiculos"      element={<Vehiculos />} />
        <Route path="/dependencias"   element={<Dependencias />} />
        <Route path="/reportes"       element={<Reportes />} />
        <Route path="/auditoria"      element={<Auditoria />} />
        <Route path="/usuarios"       element={<Usuarios />} />
        <Route path="*"               element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
