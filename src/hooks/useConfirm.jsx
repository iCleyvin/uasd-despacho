import { useState, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { AlertTriangle } from 'lucide-react'

/**
 * Hook que reemplaza window.confirm() con un modal accesible.
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirm()
 *   const ok = await confirm('¿Desactivar este vehículo?', { title: 'Confirmar' })
 *   if (!ok) return
 *   // ...acción
 *   return <> {JSX...} {ConfirmDialog} </>
 */
export function useConfirm() {
  const [state, setState] = useState({
    open: false, title: 'Confirmar', message: '', danger: false, resolve: null,
  })

  const confirm = useCallback((message, { title = 'Confirmar', danger = true } = {}) => {
    return new Promise(resolve => {
      setState({ open: true, title, message, danger, resolve })
    })
  }, [])

  function handleConfirm() {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false }))
  }

  function handleCancel() {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false }))
  }

  const ConfirmDialog = (
    <Modal open={state.open} onClose={handleCancel} title={state.title} size="sm">
      <div className="px-6 pb-6 space-y-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${state.danger ? 'text-red-500' : 'text-amber-500'}`} />
          <p className="text-sm text-slate-700 dark:text-slate-300">{state.message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleCancel}>Cancelar</Button>
          <Button variant={state.danger ? 'danger' : 'primary'} className="flex-1" onClick={handleConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )

  return { confirm, ConfirmDialog }
}
