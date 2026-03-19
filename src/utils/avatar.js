export const AVATAR_PRESETS = [
  { id: 'blue',    bg: '#1E3A8A', text: '#BFDBFE', label: 'Azul' },
  { id: 'indigo',  bg: '#3730A3', text: '#C7D2FE', label: 'Índigo' },
  { id: 'violet',  bg: '#5B21B6', text: '#DDD6FE', label: 'Violeta' },
  { id: 'pink',    bg: '#9D174D', text: '#FBCFE8', label: 'Rosa' },
  { id: 'red',     bg: '#991B1B', text: '#FECACA', label: 'Rojo' },
  { id: 'orange',  bg: '#9A3412', text: '#FED7AA', label: 'Naranja' },
  { id: 'amber',   bg: '#78350F', text: '#FDE68A', label: 'Ámbar' },
  { id: 'teal',    bg: '#0F766E', text: '#99F6E4', label: 'Cian' },
  { id: 'emerald', bg: '#065F46', text: '#A7F3D0', label: 'Esmeralda' },
  { id: 'sky',     bg: '#0369A1', text: '#BAE6FD', label: 'Celeste' },
  { id: 'slate',   bg: '#334155', text: '#CBD5E1', label: 'Pizarra' },
  { id: 'stone',   bg: '#44403C', text: '#D6D3D1', label: 'Piedra' },
]

export function getPreset(id) {
  return AVATAR_PRESETS.find(p => p.id === id) ?? null
}

/** Returns inline style object for the avatar circle */
export function avatarStyle(user) {
  if (user?.avatar_url) return null  // use <img> instead
  const preset = getPreset(user?.avatar_preset)
  if (preset) return { backgroundColor: preset.bg, color: preset.text }
  return null  // use default CSS class
}

export function initials(user) {
  return [user?.nombre?.[0], user?.apellido?.[0]].filter(Boolean).join('').toUpperCase()
}
