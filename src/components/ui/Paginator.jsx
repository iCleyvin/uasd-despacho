import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Paginator({ page, totalPages, onPage, total, pageSize }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-sm">
      <span className="text-slate-500 dark:text-slate-400">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 text-slate-600 dark:text-slate-400">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
