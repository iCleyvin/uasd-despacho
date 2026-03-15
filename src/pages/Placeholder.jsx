import { Construction } from 'lucide-react'

export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Construction className="w-8 h-8 text-slate-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold font-display text-slate-700 dark:text-slate-300">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">Módulo en desarrollo — Fase 2</p>
      </div>
    </div>
  )
}
