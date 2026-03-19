import { avatarStyle, initials } from '../../utils/avatar'

/**
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function UserAvatar({ user, size = 'md' }) {
  const sizeClass = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-24 h-24 text-3xl',
  }[size] ?? 'w-8 h-8 text-sm'

  const style = avatarStyle(user)
  const init  = initials(user)

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={init}
        className={`${sizeClass} rounded-full object-cover border-2 border-white dark:border-slate-700 shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold font-display shrink-0 ${
        style ? '' : 'bg-primary-600 text-white'
      }`}
      style={style ?? undefined}
    >
      {init}
    </div>
  )
}
