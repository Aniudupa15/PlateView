import type { MenuItem } from './data/menu'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ? JSON.stringify(body.error) : res.statusText, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function fetchMenu(): Promise<MenuItem[]> {
  return request('/api/menu')
}

export function adminLogin(email: string, password: string): Promise<{ token: string }> {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export function fetchAdminMenu(token: string): Promise<MenuItem[]> {
  return request('/api/admin/menu', { headers: authHeaders(token) })
}

export function createMenuItem(token: string, item: MenuItem): Promise<MenuItem> {
  return request('/api/admin/menu', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(item),
  })
}

export function updateMenuItem(
  token: string,
  id: string,
  patch: Partial<Omit<MenuItem, 'id'>>,
): Promise<MenuItem> {
  return request(`/api/admin/menu/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  })
}

export function deleteMenuItem(token: string, id: string): Promise<void> {
  return request(`/api/admin/menu/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
}
