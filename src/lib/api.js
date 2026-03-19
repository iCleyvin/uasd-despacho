const BASE = '/api'
const TIMEOUT_MS = 30_000

async function request(method, path, body, signal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  // Si el llamador pasa su propio signal, abortar también cuando ese se aborte
  signal?.addEventListener('abort', () => controller.abort())

  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include', // envía la cookie httpOnly automáticamente
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    if (res.status === 204) return null

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const err = new Error(data.error ?? `Error ${res.status}`)
      err.status = res.status
      if (res.status === 401) {
        if (data.error?.includes('invalidada')) {
          localStorage.setItem('session_kicked', '1')
          window.dispatchEvent(new CustomEvent('auth:kicked'))
        } else {
          // JWT expirado u otra razón — redirigir al login
          window.dispatchEvent(new CustomEvent('auth:expired'))
        }
      }
      throw err
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Verifica tu conexión.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  get:    (path, { signal } = {})       => request('GET',    path, undefined, signal),
  post:   (path, body, { signal } = {}) => request('POST',   path, body,      signal),
  put:    (path, body, { signal } = {}) => request('PUT',    path, body,      signal),
  patch:  (path, body, { signal } = {}) => request('PATCH',  path, body,      signal),
  delete: (path, { signal } = {})       => request('DELETE', path, undefined, signal),
}
