import clsx from 'clsx'

export default function Input({ label, error, icon, className, mono, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={clsx(
            'w-full rounded-lg border py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600',
            error
              ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400'
              : 'border-slate-200 dark:border-slate-600',
            icon ? 'pl-10 pr-4' : 'px-4',
            mono && 'font-plate tracking-wider',
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      )}
      <select
        className={clsx(
          'w-full rounded-lg border px-4 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-primary-600/40 focus:border-primary-600',
          error
            ? 'border-red-400'
            : 'border-slate-200 dark:border-slate-600',
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
