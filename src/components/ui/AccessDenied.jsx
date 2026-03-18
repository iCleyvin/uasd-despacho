import { ShieldOff } from 'lucide-react'

export default function AccessDenied({ mensaje }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Acceso denegado</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm">
        {mensaje ?? 'No tienes permisos para acceder a esta sección. Contacta al administrador.'}
      </p>
    </div>
  )
}
