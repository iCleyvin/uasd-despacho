import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'

// Carga diferida: solo se descarga el chunk cuando se navega a la ruta
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const NuevoDespacho  = lazy(() => import('./pages/NuevoDespacho'))
const Despachos      = lazy(() => import('./pages/Despachos'))
const Inventario     = lazy(() => import('./pages/Inventario'))
const Vehiculos      = lazy(() => import('./pages/Vehiculos'))
const Dependencias   = lazy(() => import('./pages/Dependencias'))
const Reportes       = lazy(() => import('./pages/Reportes'))
const Auditoria      = lazy(() => import('./pages/Auditoria'))
const Usuarios       = lazy(() => import('./pages/Usuarios'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/reset-password" element={<ResetPassword />} />

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
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
