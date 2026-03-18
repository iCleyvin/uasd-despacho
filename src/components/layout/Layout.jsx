import { useState, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import StockAlertBanner from './StockAlertBanner'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useInactivityTimer } from '../../hooks/useInactivityTimer'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleWarning = useCallback(() => setShowWarning(true), [])
  const handleAutoLogout = useCallback(() => {
    setShowWarning(false)
    logout()
    navigate('/login')
  }, [logout, navigate])

  useInactivityTimer({
    enabled: isAuthenticated,
    onWarning: handleWarning,
    onLogout: handleAutoLogout,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <StockAlertBanner />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Inactivity warning modal */}
      <Modal open={showWarning} onClose={() => setShowWarning(false)} title="¿Sigues ahí?">
        <div className="p-6 text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Tu sesión se cerrará automáticamente en <strong>1 minuto</strong> por inactividad.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={handleAutoLogout}>
              Cerrar sesión
            </Button>
            <Button className="flex-1" onClick={() => setShowWarning(false)}>
              Continuar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
