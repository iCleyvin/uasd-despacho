const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include', // envía la cookie httpOnly automáticamente
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error ?? `Error ${res.status}`)
    err.status = res.status
    if (res.status === 401 && data.error?.includes('invalidada')) {
      localStorage.setItem('session_kicked', '1')
      window.dispatchEvent(new CustomEvent('auth:kicked'))
    }
    throw err
  }

  return data
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  patch:  (path, body) => request('PATCH',  path, body),
  delete: (path)       => request('DELETE', path),
}
