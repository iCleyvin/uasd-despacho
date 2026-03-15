import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_LIMIT = 10 * 60 * 1000  // 10 minutos
const WARNING_BEFORE   =  1 * 60 * 1000  //  1 minuto antes

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click']

export function useInactivityTimer({ onWarning, onLogout, enabled = true }) {
  const warningTimer = useRef(null)
  const logoutTimer  = useRef(null)

  const clearTimers = useCallback(() => {
    clearTimeout(warningTimer.current)
    clearTimeout(logoutTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    if (!enabled) return
    clearTimers()
    warningTimer.current = setTimeout(() => {
      onWarning?.()
    }, INACTIVITY_LIMIT - WARNING_BEFORE)

    logoutTimer.current = setTimeout(() => {
      onLogout?.()
    }, INACTIVITY_LIMIT)
  }, [enabled, clearTimers, onWarning, onLogout])

  useEffect(() => {
    if (!enabled) return
    resetTimers()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers))
    }
  }, [enabled, resetTimers, clearTimers])
}
